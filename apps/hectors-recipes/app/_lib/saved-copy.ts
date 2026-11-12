import { SAVED_COPIES, SAVED_MARK } from "@/service-worker/rules";

const REFRESHED_KEY = "saved-copy-refreshed";
const QUIET_MS = 30_000;

type SavedCopyCheck = {
  root: Pick<Element, "hasAttribute" | "removeAttribute">;
  online: boolean;
  storage: Pick<Storage, "getItem" | "setItem"> | undefined;
  now: number;
  page: string;
  refresh: () => void;
};

// A page the service worker answered from its saved copy brings itself up to date where it
// stands, with no sign (docs/ux-plan.md D103). Not offline, and once per page in 30 s: when a
// refresh fails, Next.js loads the whole page, the worker answers with the saved copy again,
// and the page would refresh round and round.
export function refreshIfSaved({
  root,
  online,
  storage,
  now,
  page,
  refresh,
}: SavedCopyCheck): boolean {
  if (!root.hasAttribute(SAVED_MARK)) return false;
  root.removeAttribute(SAVED_MARK);
  if (!online) return false;
  const key = `${REFRESHED_KEY}:${page}`;
  try {
    if (now - Number(storage?.getItem(key) ?? 0) < QUIET_MS) return false;
    storage?.setItem(key, String(now));
  } catch {
    // Storage refused (a private window): refresh all the same.
  }
  refresh();
  return true;
}

// Registers the worker in production, and asks it to look for a new deploy whenever the app
// comes back to the front: a home-screen app that resumes doesn't navigate, which is when the
// browser would otherwise look. With the switch off (SAVED_COPIES), unregisters it instead.
export function registerSavedCopies(): () => void {
  const container = navigator.serviceWorker;
  if (!container || process.env.NODE_ENV !== "production") return () => {};
  if (!SAVED_COPIES) {
    void container
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations.map((registration) => registration.unregister()),
        ),
      );
    return () => {};
  }
  const registration = container
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .catch(() => undefined);
  const lookForUpdate = () => {
    if (document.visibilityState !== "visible") return;
    void registration.then((ready) => ready?.update()).catch(() => undefined);
  };
  document.addEventListener("visibilitychange", lookForUpdate);
  return () => document.removeEventListener("visibilitychange", lookForUpdate);
}
