import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import http from "node:http";
import { gzipSync } from "node:zlib";
import { PageFetchError } from "@/src/entities/errors/common";
import { HttpRecipePageFetcherService } from "@/src/infrastructure/services/http-recipe-page-fetcher.service";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { isPublicAddress } from "@/src/infrastructure/services/public-address";

describe("isPublicAddress", () => {
  it.each([
    ["8.8.8.8", true],
    ["93.184.216.34", true],
    ["172.32.0.1", true],
    ["2606:4700::1111", true],
    ["::ffff:8.8.8.8", true],
    ["127.0.0.1", false],
    ["10.1.2.3", false],
    ["172.16.0.1", false],
    ["192.168.1.1", false],
    ["169.254.169.254", false],
    ["100.64.0.1", false],
    ["0.0.0.0", false],
    ["224.0.0.1", false],
    ["255.255.255.255", false],
    ["::1", false],
    ["::", false],
    ["fe80::1", false],
    ["fd12:3456::1", false],
    ["::ffff:127.0.0.1", false],
    // IPv4 written inside IPv6 in the older forms, and the old site-local range.
    ["::7f00:1", false],
    ["::127.0.0.1", false],
    ["::ffff:0:7f00:1", false],
    ["64:ff9b:1::7f00:1", false],
    ["2002:7f00:1::1", false],
    ["fec0::1", false],
    ["not an address", false],
  ])("%p is public: %p", (address, expected) => {
    expect(isPublicAddress(address)).toBe(expected);
  });
});

// Why a fetch failed, or "ok".
const outcome = (promise: Promise<unknown>) =>
  promise.then(
    () => "ok",
    (err: unknown) =>
      err instanceof PageFetchError ? err.reason : `unexpected: ${String(err)}`,
  );

// Polls until `done` holds, or gives up after `ms`.
async function eventually(done: () => boolean, ms = 1_000): Promise<boolean> {
  const until = Date.now() + ms;
  while (!done() && Date.now() < until) {
    await new Promise((wait) => setTimeout(wait, 10));
  }
  return done();
}

describe("HttpRecipePageFetcherService", () => {
  const html = "<html><body><h1>Toast</h1></body></html>";
  let server: http.Server;
  let port = 0;
  // Routes that never stop sending, and whether the fetcher has hung up on each.
  const hungUp = new Map<string, boolean>();

  beforeAll(async () => {
    server = http.createServer((request, response) => {
      const route = request.url ?? "";
      const redirect = (location: string) => {
        response.writeHead(302, { location }).end();
      };
      if (route === "/page") {
        response
          .writeHead(200, {
            "content-type": "text/html; charset=utf-8",
            "content-encoding": "gzip",
          })
          .end(gzipSync(html));
      } else if (route === "/moved") {
        redirect("/page");
      } else if (route === "/to-private") {
        redirect(`http://private.test:${port}/page`);
      } else if (route === "/to-file") {
        redirect("file:///etc/passwd");
      } else if (route === "/loop") {
        redirect("/loop");
      } else if (route === "/pdf") {
        response
          .writeHead(200, { "content-type": "application/pdf" })
          .end("%PDF");
      } else if (route === "/big") {
        response
          .writeHead(200, { "content-type": "text/html" })
          .end("x".repeat(20_000));
      } else if (route.startsWith("/endless")) {
        // A video, an error page or a redirect with a body that never ends.
        const head: Record<string, http.OutgoingHttpHeaders> = {
          "/endless-video": { "content-type": "video/mp4" },
          "/endless-error": { "content-type": "text/html" },
          "/endless-redirect": { location: "/page" },
        };
        const status: Record<string, number> = {
          "/endless-error": 500,
          "/endless-redirect": 302,
        };
        hungUp.set(route, false);
        response.writeHead(status[route] ?? 200, head[route]);
        const chunk = Buffer.alloc(64 * 1024, "x");
        const sending = setInterval(() => response.write(chunk), 1);
        response.on("close", () => {
          clearInterval(sending);
          hungUp.set(route, true);
        });
      } else if (route === "/streamed") {
        // No Content-Length: the size is only known by reading.
        response.writeHead(200, { "content-type": "text/html" });
        for (let sent = 0; sent < 30_000; sent += 1_000) {
          response.write("x".repeat(1_000));
        }
        response.end();
      } else if (route === "/zipped-big") {
        // Small on the wire, too big once unzipped.
        response
          .writeHead(200, {
            "content-type": "text/html",
            "content-encoding": "gzip",
          })
          .end(gzipSync("x".repeat(1_000_000)));
      } else if (route === "/meta-charset" || route === "/http-equiv") {
        // The charset only in the page itself, as older sites write it.
        const meta =
          route === "/meta-charset"
            ? '<meta charset="iso-8859-1">'
            : '<meta http-equiv="Content-Type" content="text/html; charset=windows-1252">';
        response
          .writeHead(200, { "content-type": "text/html" })
          .end(
            Buffer.from(
              `<html><head>${meta}</head><body>Crème brûlée</body></html>`,
              "latin1",
            ),
          );
      } else if (route === "/bad-gzip") {
        // A body that says it's gzipped and isn't, still being sent.
        hungUp.set(route, false);
        response.writeHead(200, {
          "content-type": "text/html",
          "content-encoding": "gzip",
        });
        response.write("this is not gzip");
        const sending = setInterval(() => response.write("x"), 5);
        response.on("close", () => {
          clearInterval(sending);
          hungUp.set(route, true);
        });
      } else if (route === "/utf-16-meta") {
        response
          .writeHead(200, { "content-type": "text/html" })
          .end(
            '<html><head><meta charset="utf-16"></head><body>Toast</body></html>',
          );
      } else if (route === "/forbidden") {
        response.writeHead(403).end();
      } else if (route === "/slow") {
        setTimeout(() => response.writeHead(200).end(), 1_000);
      } else {
        response.writeHead(404).end();
      }
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    port = (server.address() as { port: number }).port;
  });

  afterAll(() => {
    server.close();
  });

  // Names point at the local server: "public.test" counts as public, "private.test" doesn't.
  const fetcher = (timeoutMs = 5_000) =>
    new HttpRecipePageFetcherService(new MockLoggerService(), {
      resolve: async (hostname) => {
        if (hostname === "public.test")
          return [{ address: "127.0.0.1", family: 4 }];
        if (hostname === "private.test")
          return [{ address: "127.0.0.2", family: 4 }];
        throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
      },
      isAllowedAddress: (address) => address === "127.0.0.1",
      ports: new Set([String(port)]),
      timeoutMs,
      maxBytes: 10_000,
    });
  const at = (path: string, host = "public.test") =>
    `http://${host}:${port}${path}`;

  it("fetches a page, unzipping it, and follows a redirect to its final address", async () => {
    expect(await fetcher().fetchPage(at("/page"))).toEqual({
      html,
      url: at("/page"),
    });
    expect((await fetcher().fetchPage(at("/moved"))).url).toBe(at("/page"));
  });

  it("refuses a private address, whether linked or reached by a redirect", async () => {
    expect(
      await outcome(fetcher().fetchPage(at("/page", "private.test"))),
    ).toBe("not-allowed");
    expect(await outcome(fetcher().fetchPage(at("/to-private")))).toBe(
      "not-allowed",
    );
    expect(await outcome(fetcher().fetchPage(at("/to-file")))).toBe(
      "not-allowed",
    );
  });

  it("gives up on endless redirects, slow pages and names that don't resolve", async () => {
    expect(await outcome(fetcher().fetchPage(at("/loop")))).toBe("unreachable");
    expect(await outcome(fetcher(200).fetchPage(at("/slow")))).toBe(
      "unreachable",
    );
    expect(
      await outcome(fetcher().fetchPage(at("/page", "nowhere.test"))),
    ).toBe("unreachable");
  });

  it("says what's wrong with a page it won't read", async () => {
    expect(await outcome(fetcher().fetchPage(at("/pdf")))).toBe("not-a-page");
    expect(await outcome(fetcher().fetchPage(at("/big")))).toBe("too-large");
    expect(await outcome(fetcher().fetchPage(at("/forbidden")))).toBe(
      "blocked",
    );
    expect(await outcome(fetcher().fetchPage(at("/missing")))).toBe(
      "not-found",
    );
  });

  it.each([
    ["/endless-video", "not-a-page"],
    ["/endless-error", "unreachable"],
  ])(
    "hangs up on %p rather than reading the rest of it",
    async (path, reason) => {
      expect(await outcome(fetcher().fetchPage(at(path)))).toBe(reason);
      expect(await eventually(() => hungUp.get(path) === true)).toBe(true);
    },
  );

  it("hangs up on a redirect's body and follows the redirect", async () => {
    expect((await fetcher().fetchPage(at("/endless-redirect"))).url).toBe(
      at("/page"),
    );
    expect(
      await eventually(() => hungUp.get("/endless-redirect") === true),
    ).toBe(true);
  });

  it("stops at the size cap however the page arrives: streamed, or zipped small", async () => {
    expect(await outcome(fetcher().fetchPage(at("/streamed")))).toBe(
      "too-large",
    );
    expect(await outcome(fetcher().fetchPage(at("/zipped-big")))).toBe(
      "too-large",
    );
  });

  it("hangs up on a body it can't unzip", async () => {
    expect(await outcome(fetcher().fetchPage(at("/bad-gzip")))).toBe(
      "unreachable",
    );
    expect(await eventually(() => hungUp.get("/bad-gzip") === true)).toBe(true);
  });

  // HTML says a <meta> that names UTF-16 means UTF-8: the bytes it's in can't be UTF-16.
  it("reads a page whose <meta> says UTF-16 as UTF-8", async () => {
    expect((await fetcher().fetchPage(at("/utf-16-meta"))).html).toContain(
      "Toast",
    );
  });

  it("reads a page in the charset its <meta> names when the header names none", async () => {
    for (const path of ["/meta-charset", "/http-equiv"]) {
      expect((await fetcher().fetchPage(at(path))).html).toContain(
        "Crème brûlée",
      );
    }
  });

  // With its real settings: only public addresses, on the usual ports.
  it.each([
    [`http://127.0.0.1/page`],
    [`http://localhost/page`],
    [`http://[::1]/page`],
    [`http://169.254.169.254/latest/meta-data`],
    [`http://example.com:8080/page`],
    [`http://user:secret@example.com/page`],
    [`ftp://example.com/recipe`],
    [`not a link`],
  ])("refuses %p", async (url) => {
    const real = new HttpRecipePageFetcherService(new MockLoggerService());
    expect(await outcome(real.fetchPage(url))).toBe("not-allowed");
  });
});
