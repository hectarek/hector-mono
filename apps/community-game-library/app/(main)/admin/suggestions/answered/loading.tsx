import { AdminLoading } from "@/app/(main)/admin/admin-loading";

// G7, Answered suggestions, while it loads.
export default function Loading() {
  return <AdminLoading back={{ href: "/admin", label: "Admin" }} />;
}
