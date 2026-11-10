import {
  isKeepable,
  markSaved,
  pagesCache,
  staticCache,
} from "@/service-worker/rules";

// The parts of the browser the worker uses, passed in so tests can stand in for them.
type CacheLike = Pick<Cache, "match" | "put">;
export type Deps = {
  caches: {
    open(name: string): Promise<CacheLike>;
    keys(): Promise<string[]>;
    delete(name: string): Promise<boolean>;
  };
  fetch: (request: Request) => Promise<Response>;
  version: string;
};
type RequestEvent = {
  request: Request;
  respondWith(response: Promise<Response>): void;
  waitUntil(promise: Promise<unknown>): void;
};

// A page: its saved copy answers at once, marked so the page brings itself up to date (D103).
// The network's answer is saved in the background for next time, without holding up the
// response: with no saved copy it streams to the page as usual, the outline first.
export function answerPage(event: RequestEvent, deps: Deps): void {
  const { request } = event;
  let saving: Promise<void> = Promise.resolve();
  const fresh = deps.fetch(request).then((response) => {
    if (isKeepable(response)) {
      // Copied before anything reads the body.
      const copy = response.clone();
      saving = deps.caches
        .open(pagesCache(deps.version))
        .then((cache) => cache.put(request, copy));
    }
    return response;
  });
  event.respondWith(savedCopy(request, deps).then((saved) => saved ?? fresh));
  // Offline, `fresh` fails: the saved copy has already answered, or there's nothing to show.
  event.waitUntil(fresh.then(() => saving).catch(() => undefined));
}

async function savedCopy(
  request: Request,
  deps: Deps,
): Promise<Response | undefined> {
  const cache = await deps.caches.open(pagesCache(deps.version));
  // Next.js varies pages on its own request headers; a page load sends none of them.
  const saved = await cache.match(request, { ignoreVary: true });
  if (!saved) return undefined;
  const headers = new Headers(saved.headers);
  headers.delete("content-length");
  return new Response(markSaved(await saved.text()), {
    status: saved.status,
    statusText: saved.statusText,
    headers,
  });
}

// A build file: named by its content, so the saved one is right for as long as it's kept.
export function answerStatic(event: RequestEvent, deps: Deps): void {
  const { request } = event;
  event.respondWith(
    deps.caches.open(staticCache(deps.version)).then(async (cache) => {
      const saved = await cache.match(request);
      if (saved) return saved;
      const response = await deps.fetch(request);
      if (response.ok) {
        event.waitUntil(cache.put(request, response.clone()));
      }
      return response;
    }),
  );
}

// Signing out, or landing on Welcome: the saved pages go, so nobody else sees them.
export async function clearSaved(deps: Pick<Deps, "caches">): Promise<void> {
  const names = await deps.caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith("pages-"))
      .map((name) => deps.caches.delete(name)),
  );
}

// Every cache but the ones named: a new deploy keeps only its own, and the off switch none.
export async function deleteCachesExcept(
  deps: Pick<Deps, "caches">,
  keep: string[],
): Promise<void> {
  const names = await deps.caches.keys();
  await Promise.all(
    names
      .filter((name) => !keep.includes(name))
      .map((name) => deps.caches.delete(name)),
  );
}
