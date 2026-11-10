import { describe, expect, it } from "bun:test";
import {
  answerPage,
  answerStatic,
  clearSaved,
  type Deps,
  deleteCachesExcept,
} from "@/service-worker/handlers";
import { pagesCache, SAVED_MARK, staticCache } from "@/service-worker/rules";

const URL_PLAN = "https://recipes.example/plan";
const VERSION = "v1";

const page = (html: string) =>
  new Response(html, { headers: { "content-type": "text/html" } });

const keyOf = (request: RequestInfo | URL) =>
  typeof request === "string"
    ? request
    : request instanceof URL
      ? request.href
      : request.url;

// The browser's Cache API, kept in memory.
function memoryCaches() {
  const stores = new Map<string, Map<string, Response>>();
  return {
    stores,
    async open(name: string) {
      const store = stores.get(name) ?? new Map<string, Response>();
      stores.set(name, store);
      return {
        async match(request: RequestInfo | URL) {
          return store.get(keyOf(request))?.clone();
        },
        async put(request: RequestInfo | URL, response: Response) {
          store.set(
            keyOf(request),
            new Response(await response.arrayBuffer(), {
              status: response.status,
              headers: response.headers,
            }),
          );
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
  };
}

// A fetch event: keeps the answer and what it was asked to wait for.
function fetchEvent(url: string) {
  let answer: Promise<Response> | undefined;
  const waits: Promise<unknown>[] = [];
  return {
    request: new Request(url),
    respondWith(response: Promise<Response>) {
      answer = response;
    },
    waitUntil(promise: Promise<unknown>) {
      waits.push(promise);
    },
    answer: () => {
      if (!answer) throw new Error("not answered");
      return answer;
    },
    async settled() {
      const response = await answer?.catch(() => undefined);
      await Promise.all(waits);
      return response;
    },
  };
}

function setup(fetch: Deps["fetch"]) {
  const caches = memoryCaches();
  const deps: Deps = { caches, fetch, version: VERSION };
  const saved = async (name: string, url: string) =>
    (await caches.open(name)).match(url).then((response) => response?.text());
  return { caches, deps, saved };
}

describe("answerPage", () => {
  it("with nothing saved, the network answers, and the page is saved", async () => {
    const { deps, saved } = setup(async () => page("<html>fresh</html>"));
    const event = fetchEvent(URL_PLAN);
    answerPage(event, deps);

    expect(await (await event.answer()).text()).toBe("<html>fresh</html>");
    await event.settled();
    expect(await saved(pagesCache(VERSION), URL_PLAN)).toBe(
      "<html>fresh</html>",
    );
  });

  it("answers with the saved copy before the network does, marked, then saves the network's", async () => {
    let arrive = (_: Response) => {};
    const network = new Promise<Response>((resolve) => {
      arrive = resolve;
    });
    const { caches, deps, saved } = setup(() => network);
    await (await caches.open(pagesCache(VERSION))).put(
      URL_PLAN,
      page("<html>old</html>"),
    );
    const event = fetchEvent(URL_PLAN);
    answerPage(event, deps);

    expect(await (await event.answer()).text()).toBe(
      `<html ${SAVED_MARK}="">old</html>`,
    );
    arrive(page("<html>new</html>"));
    await event.settled();
    expect(await saved(pagesCache(VERSION), URL_PLAN)).toBe("<html>new</html>");
  });

  it("offline, the saved copy still answers", async () => {
    const { caches, deps } = setup(async () => {
      throw new TypeError("Load failed");
    });
    await (await caches.open(pagesCache(VERSION))).put(
      URL_PLAN,
      page("<html>old</html>"),
    );
    const event = fetchEvent(URL_PLAN);
    answerPage(event, deps);

    expect(await (await event.answer()).text()).toBe(
      `<html ${SAVED_MARK}="">old</html>`,
    );
    await event.settled();
  });

  it("passes a redirect on, and saves nothing", async () => {
    const { deps, saved } = setup(
      async () =>
        new Response(null, {
          status: 307,
          headers: { location: "/welcome" },
        }),
    );
    const event = fetchEvent(URL_PLAN);
    answerPage(event, deps);

    expect((await event.answer()).status).toBe(307);
    await event.settled();
    expect(await saved(pagesCache(VERSION), URL_PLAN)).toBeUndefined();
  });
});

describe("answerStatic", () => {
  it("fetches a build file once, then answers from what it saved", async () => {
    let fetches = 0;
    const { deps } = setup(async () => {
      fetches += 1;
      return new Response("console.log(1)");
    });
    const url = "https://recipes.example/_next/static/chunks/a-123.js";

    const first = fetchEvent(url);
    answerStatic(first, deps);
    expect(await (await first.answer()).text()).toBe("console.log(1)");
    await first.settled();

    const second = fetchEvent(url);
    answerStatic(second, deps);
    expect(await (await second.answer()).text()).toBe("console.log(1)");
    expect(fetches).toBe(1);
  });
});

describe("clearing", () => {
  it("clearSaved deletes the saved pages and keeps the build files", async () => {
    const { caches } = setup(async () => page(""));
    await caches.open(pagesCache(VERSION));
    await caches.open(pagesCache("v0"));
    await caches.open(staticCache(VERSION));

    await clearSaved({ caches });
    expect(await caches.keys()).toEqual([staticCache(VERSION)]);
  });

  it("deleteCachesExcept keeps only the caches named", async () => {
    const { caches } = setup(async () => page(""));
    for (const name of [
      pagesCache("v0"),
      staticCache("v0"),
      pagesCache(VERSION),
      staticCache(VERSION),
    ]) {
      await caches.open(name);
    }

    await deleteCachesExcept({ caches }, [
      pagesCache(VERSION),
      staticCache(VERSION),
    ]);
    expect(await caches.keys()).toEqual([
      pagesCache(VERSION),
      staticCache(VERSION),
    ]);
  });
});
