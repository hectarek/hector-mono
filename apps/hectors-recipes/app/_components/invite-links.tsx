"use client";

import { Button } from "@repo/ui/components/button";
import { Link2 } from "lucide-react";
import { ActionForm } from "@/app/_components/action-form";
import { RoleBadge } from "@/app/_components/role-badge";
import { ShareLinkButton } from "@/app/_components/share-link-button";
import { createInvite, revokeInvite } from "@/app/actions/spaces";
import type { SpaceInvite } from "@/src/entities/models/space.model";
import { PLAN_TIME_ZONE } from "@/src/entities/week";

export function InviteLinks({
  spaceId,
  spaceName,
  invites,
}: {
  spaceId: string;
  spaceName: string;
  invites: SpaceInvite[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Anyone who opens a link while signed in can join. Turn a link off to
        stop new people joining with it; people already in stay in.
      </p>

      {invites.length > 0 && (
        <ul className="flex flex-col divide-y rounded-xl border">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center gap-2 p-3"
            >
              <Link2 className="text-muted-foreground size-4" aria-hidden />
              <RoleBadge role={invite.role} />
              <span className="text-muted-foreground flex-1 text-xs">
                Created{" "}
                {invite.createdAt.toLocaleDateString("en-US", {
                  // Fixed, so the server's render matches the phone's (no hydration mismatch).
                  timeZone: PLAN_TIME_ZONE,
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <ShareLinkButton
                path={`/join/${invite.token}`}
                title={`Join ${spaceName}`}
              />
              <ActionForm
                action={revokeInvite}
                fields={{ inviteId: invite.id }}
              >
                {({ isPending }) => (
                  <Button
                    variant="secondary"
                    size="lg"
                    type="submit"
                    disabled={isPending}
                  >
                    Turn off
                  </Button>
                )}
              </ActionForm>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <ActionForm action={createInvite} fields={{ spaceId, role: "editor" }}>
          {({ isPending }) => (
            <Button type="submit" size="lg" disabled={isPending}>
              New link: can edit
            </Button>
          )}
        </ActionForm>
        <ActionForm action={createInvite} fields={{ spaceId, role: "viewer" }}>
          {({ isPending }) => (
            <Button
              type="submit"
              size="lg"
              variant="secondary"
              disabled={isPending}
            >
              New link: view only
            </Button>
          )}
        </ActionForm>
      </div>
    </div>
  );
}
