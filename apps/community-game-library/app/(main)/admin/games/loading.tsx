import { AdminLoading } from "@/app/(main)/admin/admin-loading";

// G5, Find a game to edit, while it loads.
export default function Loading() {
  return <AdminLoading back={{ href: "/admin", label: "Admin" }} />;
}
