import { promises as dns, type LookupAddress } from "node:dns";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRecipePageFetcherService } from "@/src/application/services/recipe-page-fetcher.service.interface";
import {
  PageFetchError,
  type PageFetchFailure,
} from "@/src/entities/errors/common";
import { isPublicAddress } from "./public-address";

// Says who's asking rather than posing as a browser; a site that refuses it gets "paste the
// text or a screenshot instead" (ux-plan P10.3).
const USER_AGENT =
  "HectorsRecipes/1.0 (+https://hector-mono-hectors-recipes.vercel.app)";

type Resolve = (hostname: string) => Promise<LookupAddress[]>;

export type PageFetcherOptions = {
  // Tests point names at a local server and say which addresses and ports count as allowed.
  resolve?: Resolve;
  isAllowedAddress?: (address: string) => boolean;
  ports?: ReadonlySet<string>;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
};

class AddressNotAllowedError extends Error {}

// Fetches a linked recipe page safely: http or https on the usual ports, every address a
// name resolves to checked as it connects (so a name can't be pointed at this server's
// network between the check and the fetch), redirects followed by hand and each one checked
// again, a time limit, a size cap, HTML only, and no cookies.
export class HttpRecipePageFetcherService implements IRecipePageFetcherService {
  private readonly logger: ILoggerService;
  private readonly resolve: Resolve;
  private readonly isAllowedAddress: (address: string) => boolean;
  private readonly ports: ReadonlySet<string>;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly maxRedirects: number;

  constructor(logger: ILoggerService, options: PageFetcherOptions = {}) {
    this.logger = logger.child({ layer: "service", op: "fetchPage" });
    this.resolve =
      options.resolve ?? ((hostname) => dns.lookup(hostname, { all: true }));
    this.isAllowedAddress = options.isAllowedAddress ?? isPublicAddress;
    // URL leaves a scheme's own port out, so "" is 80 for http and 443 for https.
    this.ports = options.ports ?? new Set(["", "80", "443"]);
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.maxBytes = options.maxBytes ?? 3 * 1024 * 1024;
    this.maxRedirects = options.maxRedirects ?? 3;
  }

  async fetchPage(url: string): Promise<{ html: string; url: string }> {
    let current = this.checkUrl(url);
    for (let redirects = 0; ; redirects++) {
      const result = await this.get(current);
      if ("html" in result) {
        this.logger.info("Fetched a page", {
          host: current.hostname,
          characters: result.html.length,
          redirects,
        });
        return { html: result.html, url: current.toString() };
      }
      if (redirects >= this.maxRedirects) {
        throw new PageFetchError("unreachable", "Too many redirects");
      }
      current = this.checkUrl(new URL(result.location, current).toString());
    }
  }

  private checkUrl(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new PageFetchError("not-allowed", "Not a web address");
    }
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const allowed =
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      this.ports.has(url.port) &&
      // An address written out never goes through the name lookup, so it's checked here.
      (isIP(host) === 0 || this.isAllowedAddress(host));
    if (!allowed) {
      throw new PageFetchError(
        "not-allowed",
        `Not a public web page: ${url.protocol}//${url.host}`,
      );
    }
    return url;
  }

  private readonly checkedLookup: LookupFunction = (
    hostname,
    options,
    callback,
  ) => {
    this.resolve(hostname).then(
      (addresses) => {
        const [first] = addresses;
        if (
          !first ||
          addresses.some(({ address }) => !this.isAllowedAddress(address))
        ) {
          callback(
            new AddressNotAllowedError(`${hostname} isn't a public address`),
            "",
            4,
          );
        } else if (options.all) {
          callback(null, addresses);
        } else {
          callback(null, first.address, first.family);
        }
      },
      (err: NodeJS.ErrnoException) => callback(err, "", 4),
    );
  };

  private get(url: URL): Promise<{ html: string } | { location: string }> {
    return new Promise((resolve, reject) => {
      const fail = (
        reason: PageFetchFailure,
        message: string,
        cause?: unknown,
      ) => {
        clearTimeout(timer);
        reject(new PageFetchError(reason, message, { cause }));
      };
      const client = url.protocol === "https:" ? https : http;
      const request = client.get(
        url,
        {
          headers: {
            "user-agent": USER_AGENT,
            accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "en",
          },
          lookup: this.checkedLookup,
        },
        // Every response not read is destroyed, never drained: draining keeps downloading
        // after the timer is cleared, with no limit (a video, an endless error page).
        (response) => {
          const status = response.statusCode ?? 0;
          const location = response.headers.location;
          if (status >= 300 && status < 400 && location) {
            response.destroy();
            clearTimeout(timer);
            resolve({ location });
            return;
          }
          const failure = statusFailure(status);
          if (failure) {
            response.destroy();
            fail(failure, `HTTP ${status}`);
            return;
          }
          const type = response.headers["content-type"] ?? "";
          if (!/text\/html|application\/xhtml\+xml/i.test(type)) {
            response.destroy();
            fail("not-a-page", `Content type ${type || "none"}`);
            return;
          }
          if (Number(response.headers["content-length"]) > this.maxBytes) {
            response.destroy();
            fail("too-large", "Page too large");
            return;
          }
          this.readBody(response).then(
            (body) => {
              clearTimeout(timer);
              resolve({ html: decodeText(body, type) });
            },
            (err: unknown) =>
              err instanceof PageFetchError
                ? fail(err.reason, err.message)
                : fail("unreachable", describe(err), err),
          );
        },
      );
      const timer = setTimeout(
        () => request.destroy(new PageFetchError("unreachable", "Timed out")),
        this.timeoutMs,
      );
      request.on("error", (err) => {
        if (err instanceof PageFetchError) {
          fail(err.reason, err.message);
        } else if (err instanceof AddressNotAllowedError) {
          fail("not-allowed", err.message);
        } else {
          fail("unreachable", describe(err), err);
        }
      });
    });
  }

  private readBody(response: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const body = decompressed(response);
      const chunks: Buffer[] = [];
      let size = 0;
      body.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > this.maxBytes) {
          body.destroy();
          response.destroy();
          reject(new PageFetchError("too-large", "Page too large"));
          return;
        }
        chunks.push(chunk);
      });
      body.on("end", () => resolve(Buffer.concat(chunks)));
      // A body that won't unzip: hang up, or it keeps sending into a paused stream.
      body.on("error", (err) => {
        response.destroy();
        reject(err);
      });
    });
  }
}

function statusFailure(status: number): PageFetchFailure | null {
  if (status === 404 || status === 410) return "not-found";
  if ([401, 403, 429, 451].includes(status)) return "blocked";
  if (status < 200 || status >= 300) return "unreachable";
  return null;
}

function decompressed(response: IncomingMessage): Readable {
  const encoding = response.headers["content-encoding"]?.toLowerCase();
  const decoder =
    encoding === "gzip" || encoding === "x-gzip"
      ? createGunzip()
      : encoding === "deflate"
        ? createInflate()
        : encoding === "br"
          ? createBrotliDecompress()
          : null;
  if (!decoder) return response;
  response.on("error", (err) => decoder.destroy(err));
  return response.pipe(decoder);
}

// The page's text in the charset its header names, else the one its <meta> names in its first
// 1,024 bytes (as browsers look; a <meta> naming UTF-16 means UTF-8, since it was readable as
// ASCII), else UTF-8.
function decodeText(body: Buffer, contentType: string): string {
  const meta = /<meta\b[^<>]*?charset\s*=\s*["']?([\w-]+)/i.exec(
    body.subarray(0, 1024).toString("latin1"),
  )?.[1];
  const charset =
    /charset=["']?([^;"'\s]+)/i.exec(contentType)?.[1] ??
    (meta && /^utf-16/i.test(meta) ? "utf-8" : meta);
  try {
    return new TextDecoder(charset ?? "utf-8").decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

// An error's kind for the log, never its whole object.
function describe(err: unknown): string {
  const { code } = err as NodeJS.ErrnoException;
  return code ?? (err instanceof Error ? err.name : "Unknown error");
}
