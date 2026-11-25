import { redirect } from "next/navigation";

// Your friend link opens as a sheet over the page you're on (E2; Hector, 2026-11-25). This was
// its page's address, so links and bookmarks to it open Friends with the sheet open. It reads
// nothing at request time, so it needs no loading.tsx of its own.
export default function FriendLinkPage() {
  redirect("/friends?show=friend-link");
}
