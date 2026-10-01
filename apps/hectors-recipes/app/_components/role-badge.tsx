import { Badge } from "@repo/ui/components/badge";
import type { SpaceRole } from "@/src/entities/models/space.model";

const LABELS: Record<SpaceRole, string> = {
  owner: "Owner",
  editor: "Can edit",
  viewer: "View only",
};

export function RoleBadge({ role }: { role: SpaceRole }) {
  return (
    <Badge variant={role === "viewer" ? "outline" : "secondary"}>
      {LABELS[role]}
    </Badge>
  );
}
