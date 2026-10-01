"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import { Progress } from "@repo/ui/components/progress";
import {
  AlertTriangle,
  Briefcase,
  Clock,
  Heart,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { EditDialog } from "@/app/_components/edit-dialog";
import { InteractionDialog } from "@/app/_components/interaction-dialog";
import { InteractionHistory } from "@/app/_components/interaction-history";
import {
  type EmotionalTone,
  getHealthStatus,
  type HealthStatusKey,
  type InteractionType,
  isContactOverdue,
} from "@/app/_lib/model";
import type { Relationship } from "@/app/_lib/types";
import { TYPE_TO_CATEGORY } from "@/app/_lib/types";
import {
  formatRelativeTime,
  getDaysSinceContact,
  getDunbarLayerLabel,
  getRelationshipIcon,
} from "@/app/_lib/utils";

interface RelationshipCardProps {
  relationship: Relationship;
  onInteraction: (
    id: number,
    interactionType: InteractionType,
    emotionalTone: EmotionalTone,
    durationMinutes: number,
    activityContext?: string,
  ) => void;
  onEdit: (id: number, updates: Partial<Relationship>) => void;
}

const iconMap = {
  Users,
  Heart,
  User,
  UserPlus,
  Briefcase,
} as const;

// The strength bar's colour by health, from the theme's status tokens. The bar draws its fill
// with --primary, so each card re-points that for its own bar.
const healthColors: Record<HealthStatusKey, string> = {
  thriving: "var(--success)",
  healthy: "var(--info)",
  needsAttention: "var(--warning)",
  atRisk: "var(--destructive)",
  dormant: "var(--muted-foreground)",
};

export function RelationshipCard({
  relationship,
  onInteraction,
  onEdit,
}: RelationshipCardProps) {
  const iconName = getRelationshipIcon(relationship.type);
  const IconComponent = iconMap[iconName as keyof typeof iconMap] || Users;

  const { strength } = relationship;
  const healthStatus = getHealthStatus(strength);
  const progressColor = healthColors[healthStatus.key];

  const dunbarLayer = relationship.dunbarLayer ?? "activeNetwork";
  const category = TYPE_TO_CATEGORY[relationship.type];
  const daysSinceContact = getDaysSinceContact(relationship.lastInteraction);
  const overdue = isContactOverdue(daysSinceContact, dunbarLayer, category);

  return (
    <Card data-card="plain">
      <CardContent>
        <div className="flex items-center gap-4 pt-4">
          <Avatar size="lg">
            <AvatarImage src={relationship.imageUrl} />
            <AvatarFallback>{relationship.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="grow space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{relationship.name}</span>
                {overdue && <AlertTriangle className="text-warning size-4" />}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  <IconComponent className="size-4" />
                  {relationship.type.replace("_", " ")}
                </Badge>
                <Badge variant="outline">
                  {getDunbarLayerLabel(dunbarLayer)}
                </Badge>
                <EditDialog relationship={relationship} onEdit={onEdit} />
              </div>
            </div>
            <Progress
              value={strength}
              style={{ "--primary": progressColor } as React.CSSProperties}
            />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">
                  {Math.round(strength)}%
                </span>
                <Badge
                  variant={
                    healthStatus.key === "thriving" ||
                    healthStatus.key === "healthy"
                      ? "default"
                      : "secondary"
                  }
                >
                  {healthStatus.label}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatRelativeTime(relationship.lastInteraction)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <InteractionHistory
                  relationshipName={relationship.name}
                  interactions={relationship.interactions ?? []}
                />
                <InteractionDialog
                  relationshipId={relationship.id}
                  relationshipName={relationship.name}
                  onInteraction={onInteraction}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
