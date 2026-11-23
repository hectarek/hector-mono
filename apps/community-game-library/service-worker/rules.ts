// What the service worker does with each request (docs/build-plan.md KTD19). Shared with
// the page (`app/_components/saved-copy.tsx`), so both read the same switch.

// The switch: false makes the worker clear what it saved and unregister itself, and the page
// stop registering it. One change and a deploy, if saved copies ever misbehave.
export const SAVED_COPIES = true;

export type Route = "page" | "static" | "sign-out" | "network";

// The pages saved on the phone (KTD19): the ones you read, the Library and My library, a game
// and a copy, Loans and a loan, Nights and a night, Friends and a friend, the inbox and You. Not
// the forms and sheets, which read fresh, nor Past loans, Past game nights, a friend link, the
// admin's pages, sign-in, the account pages or a link someone sent.
const SAVED_PAGES = [
  /^\/$/,
  /^\/my-library$/,
  /^\/games\/[^/]+$/,
  /^\/copies\/[^/]+$/,
  /^\/loans$/,
  /^\/loans\/(?!past$|record$)[^/]+$/,
  /^\/nights$/,
  /^\/nights\/(?!new$|past$)[^/]+$/,
  /^\/friends$/,
  /^\/friends\/(?!link$)[^/]+$/,
  /^\/inbox$/,
  /^\/you$/,
];

// Arriving here means leaving the signed-in app, so what was saved goes: the welcome page,
// signing out, and a removed account's page.
const SIGNED_OUT = [/^\/welcome$/, /^\/auth\/sign-out$/, /^\/removed$/];

type RequestLike = Pick<Request, "url" | "method" | "mode">;

// "page": answered from its saved copy at once, then saved afresh from the network.
// "static": a build file, named by its content, so a saved one is never out of date.
// "sign-out": the network answers, and the saved pages are deleted.
// "network": untouched. That's every RSC request, server action and API call, and the forms.
export function routeFor(request: RequestLike, origin: string): Route {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== origin) return "network";
  if (url.pathname.startsWith("/_next/static/")) return "static";
  if (request.mode !== "navigate") return "network";
  if (SIGNED_OUT.some((path) => path.test(url.pathname))) return "sign-out";
  return SAVED_PAGES.some((path) => path.test(url.pathname))
    ? "page"
    : "network";
}

// A page worth saving: the page itself, not a redirect (the proxy's, to the welcome page) or an error.
// A redirect a page load doesn't follow comes back with status 0, so the status rules it out.
export function isKeepable(response: Response): boolean {
  return (
    response.status === 200 &&
    !response.redirected &&
    (response.headers.get("content-type") ?? "").includes("text/html")
  );
}

// Marks a page served from its saved copy, so the page knows to bring itself up to date.
export const SAVED_MARK = "data-saved-copy";

export function markSaved(html: string): string {
  return html.replace(/<html(?=[\s>])/, `<html ${SAVED_MARK}=""`);
}

// One deploy's caches. A new deploy's worker deletes every other deploy's, so a saved page
// never outlives the build files it needs.
export const pagesCache = (version: string) => `pages-${version}`;
export const staticCache = (version: string) => `static-${version}`;
