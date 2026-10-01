"use client";

import { Button } from "@repo/ui/components/button";
import { ActionForm } from "@/app/_components/action-form";
import { RoleBadge } from "@/app/_components/role-badge";
import { removeMember, setMemberRole } from "@/app/actions/spaces";
import type { SpaceMember, SpaceRole } from "@/src/entities/models/space.model";

export function MemberList({
  spaceId,
  members,
  viewerRole,
  viewerId,
  home,
}: {
  spaceId: string;
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
                      variant="outline"
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
                <ActionForm
                  action={removeMember}
                  fields={{ spaceId, memberId: member.userId }}
                >
                  {({ isPending }) => (
                    <Button
                      variant="secondary"
                      size="lg"
                      type="submit"
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  )}
                </ActionForm>
              </div>
            )}

            {isSelf && member.role !== "owner" && (
              <ActionForm
                action={removeMember}
                fields={{ spaceId, memberId: member.userId, home }}
              >
                {({ isPending }) => (
                  <Button
                    variant="secondary"
                    size="lg"
                    type="submit"
                    disabled={isPending}
                    className="self-start"
                  >
                    Leave
                  </Button>
                )}
              </ActionForm>
            )}
          </li>
        );
      })}
    </ul>
  );
}
