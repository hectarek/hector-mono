import { AdminLoading } from "@/app/(main)/admin/admin-loading";

// G4, a game's record, while it loads.
export default function Loading() {
  return (
    <AdminLoading
      back={{ href: "/admin/games", label: "Find a game to edit" }}
    />
  );
}
