import { AdminLoading } from "@/app/(main)/admin/admin-loading";

// G2, a suggestion, while it loads.
export default function Loading() {
  return <AdminLoading back={{ href: "/admin", label: "Admin" }} />;
}
