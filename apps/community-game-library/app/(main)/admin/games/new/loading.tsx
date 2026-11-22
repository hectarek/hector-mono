import { AdminLoading } from "@/app/(main)/admin/admin-loading";

// G3, Add a game by hand, while it loads. Opened from a suggestion, its back link names the
// suggestion once the page has read it.
export default function Loading() {
  return <AdminLoading back={{ href: "/admin", label: "Admin" }} />;
}
