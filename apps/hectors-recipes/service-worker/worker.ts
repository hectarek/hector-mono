// The service worker (docs/ux-plan.md P31.2), built into public/sw.js by
// scripts/build-service-worker.ts before `next build`.
import {
  answerPage,
  answerStatic,
  clearSaved,
  deleteCachesExcept,
} from "@/service-worker/handlers";
import {
  pagesCache,
  routeFor,
  SAVED_COPIES,
  staticCache,
} from "@/service-worker/rules";

// The commit being built, set by the build script. Each deploy's worker differs from the
// last, so the browser installs it, and it drops the last deploy's saved pages.
declare const SERVICE_WORKER_VERSION: string;

// The few parts of a service worker's scope this uses (the app's types are the page's, not a
// worker's).
type ExtendableEvent = Event & { waitUntil(promise: Promise<unknown>): void };
type FetchEvent = ExtendableEvent & {
  request: Request;
  respondWith(response: Promise<Response>): void;
};
type WorkerScope = {
  addEventListener(
    type: "install" | "activate",
    listener: (event: ExtendableEvent) => void,
  ): void;
  addEventListener(type: "fetch", listener: (event: FetchEvent) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  registration: { unregister(): Promise<boolean> };
  location: { origin: string };
};

const scope = self as unknown as WorkerScope;
const deps = {
  caches,
  fetch: (request: Request) => fetch(request),
  version: SERVICE_WORKER_VERSION,
};

// A new deploy's worker takes over at once, rather than waiting for every tab to close.
scope.addEventListener("install", (event) => {
  event.waitUntil(scope.skipWaiting());
});

scope.addEventListener("activate", (event) => {
  event.waitUntil(
    SAVED_COPIES
      ? deleteCachesExcept(deps, [
          pagesCache(deps.version),
          staticCache(deps.version),
        ]).then(() => scope.clients.claim())
      : deleteCachesExcept(deps, []).then(() =>
          scope.registration.unregister(),
        ),
  );
});

scope.addEventListener("fetch", (event) => {
  if (!SAVED_COPIES) return;
  const route = routeFor(event.request, scope.location.origin);
  if (route === "page") answerPage(event, deps);
  else if (route === "static") answerStatic(event, deps);
  else if (route === "sign-out") event.waitUntil(clearSaved(deps));
});
