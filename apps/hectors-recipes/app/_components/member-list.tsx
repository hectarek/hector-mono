"use client";

import { Button } from "@repo/ui/components/button";
import { ActionForm } from "@/app/_components/action-form";
import { ConfirmActionButton } from "@/app/_components/confirm-action-button";
import { RoleBadge } from "@/app/_components/role-badge";
import { removeMember, setMemberRole } from "@/app/actions/spaces";
import type { SpaceMember, SpaceRole } from "@/src/entities/models/space.model";

export function MemberList({
  spaceId,
  spaceName,
  members,
  viewerRole,
  viewerId,
  home,
}: {
  spaceId: string;
  spaceName: string;
  members: SpaceMember[];
  viewerRole: SpaceRole;
  viewerId: string;
  // Where to land after leaving (the tab for this space's type).
  home: string;
}) {
  const isOwner = viewerRole === "owner";

  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {members.map((member) => {
        const isSelf = member.userId === viewerId;
        const label = member.name || member.email || "Unknown member";
        const manageable = isOwner && member.role !== "owner";

        return (
          <li key={member.userId} className="flex flex-col gap-2 p-3">
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {label}
                  {isSelf && (
                    <span className="text-muted-foreground"> (you)</span>
                  )}
                </span>
                {member.name && member.email && (
                  <span className="text-muted-foreground truncate text-xs">
                    {member.email}
                  </span>
                )}
              </div>
              <RoleBadge role={member.role} />
            </div>

            {manageable && (
              <div className="flex flex-wrap gap-2">
                <ActionForm
                  action={setMemberRole}
                  fields={{
                    spaceId,
                    memberId: member.userId,
                    role: member.role === "editor" ? "viewer" : "editor",
                  }}
                >
                  {({ isPending }) => (
                    <Button
                      variant="secondary"
                      size="lg"
                      type="submit"
                      disabled={isPending}
                    >
                      {member.role === "editor"
                        ? "Make view only"
                        : "Allow editing"}
                    </Button>
                  )}
                </ActionForm>
                <ConfirmActionButton
                  label="Remove"
                  title={`Remove ${label}?`}
                  description={`They'll no longer see “${spaceName}”. A new invite link brings them back.`}
                  action={removeMember}
                  fields={{ spaceId, memberId: member.userId }}
                />
              </div>
            )}

            {isSelf && member.role !== "owner" && (
              <ConfirmActionButton
                label="Leave"
                title={`Leave “${spaceName}”?`}
                description="You'll no longer see it. To come back, you'll need a new invite link."
                action={removeMember}
                fields={{ spaceId, memberId: member.userId, home }}
                className="self-start"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
