import { AdminLoading } from "@/app/(main)/admin/admin-loading";

// G1, Admin, while it loads.
export default function Loading() {
  return <AdminLoading back={{ href: "/you", label: "You" }} />;
}
