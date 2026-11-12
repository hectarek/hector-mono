import { safeRedirect } from "@/app/_lib/safe-redirect";

// Where a record's back link goes, and what it says (the UX plan's UX8).
export type Back = { href: string; label: string };

// What the pages under each path are called, as a back link names them: the list, or a record.
const PLACES: readonly { base: string; list: string; record: string }[] = [
  { base: "/jobs", list: "Jobs", record: "Job" },
  { base: "/people", list: "People", record: "Person" },
  { base: "/companies", list: "Companies", record: "Company" },
  { base: "/practice", list: "Practice", record: "Practice session" },
  { base: "/week", list: "Weekly review", record: "Weekly review" },
  { base: "/blocks", list: "Weekly review", record: "Block" },
];

// A link to a record's page that says where it was opened from, so the record's back link
// returns there.
export function withFrom(href: string, from: string | undefined): string {
  if (!from) return href;
  return `${href}${href.includes("?") ? "&" : "?"}from=${encodeURIComponent(from)}`;
}

// A record's back link: the page its `from` names, when that's a page of this app, or else the
// section's list. `from` is checked as a redirect is (safe-redirect.ts), so it never leaves the app.
export function backTo(
  from: string | string[] | undefined,
  fallback: Back,
): Back {
  const raw = Array.isArray(from) ? from[0] : from;
  if (raw === undefined) return fallback;
  const href = safeRedirect(raw);
  if (href === "/") {
    return raw === "/" ? { href, label: "Today" } : fallback;
  }
  const path = href.split(/[?#]/)[0] ?? "";
  const place = PLACES.find(
    ({ base }) => path === base || path.startsWith(`${base}/`),
  );
  if (!place) return fallback;
  return { href, label: path === place.base ? place.list : place.record };
}
