"use client";

import { Button } from "@repo/ui/components/button";
import { ChevronLeft, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState, useTransition } from "react";
import { ShareLinkButton } from "@/app/_components/share-link-button";
import { TitleMenu } from "@/app/_components/title-menu";
import { type InviteLinksState, inviteLinks } from "@/app/actions/spaces";
import type { SpaceRole } from "@/src/entities/models/space.model";

// A book or plan's ⋯ sheet (D42): Invite for the owner (D20), Members, and the tab's own
// actions. Invite turns the sheet into the two links, fetched then, because iOS opens the
// share sheet only straight from a tap, never after an await: each later tap only shares.
export function SpaceMenu({
  space,
  contents,
  children,
}: {
  space: { id: string; name: string; role: SpaceRole };
  // What joining gives them, in a sentence ("meal plan (with its grocery list)").
  contents: string;
  // The tab's own actions, after Members.
  children?: ReactNode;
}) {
  const [inviting, setInviting] = useState(false);
  const [links, setLinks] = useState<InviteLinksState | null>(null);
  const [isPending, startTransition] = useTransition();
  const tokens = links?.ok ? links.tokens : undefined;

  function invite() {
    setInviting(true);
    if (tokens) return;
    startTransition(async () => {
      try {
        setLinks(await inviteLinks(space.id));
      } catch {
        setLinks({
          ok: false,
          error:
            "Couldn't reach the server. Check your connection and try again.",
        });
      }
    });
  }

  return (
    <TitleMenu
      name={space.name}
      title={inviting ? `Invite to ${space.name}` : space.name}
      description={
        inviting
          ? `Pick what they can do, then send the link. Whoever opens it and signs in joins the ${contents}.`
          : undefined
      }
      onOpenChange={(open) => {
        if (!open) setInviting(false);
      }}
    >
      {inviting ? (
        <>
          <ShareLinkButton
            token={tokens?.editor}
            spaceName={space.name}
            gives="editor"
            pending={isPending}
            variant="default"
          />
          <ShareLinkButton
            token={tokens?.viewer}
            spaceName={space.name}
            gives="viewer"
            pending={isPending}
          />
          {links && !links.ok && (
            <p role="alert" className="text-destructive text-sm">
              {links.error}
            </p>
          )}
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setInviting(false)}
          >
            <ChevronLeft data-icon="inline-start" />
            Back
          </Button>
        </>
      ) : (
        <>
          {space.role === "owner" && (
            <Button size="lg" onClick={invite}>
              <UserPlus data-icon="inline-start" />
              Invite
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            nativeButton={false}
            render={<Link href={`/spaces/${space.id}/settings`} />}
          >
            <Users data-icon="inline-start" />
            Members
          </Button>
          {children}
        </>
      )}
    </TitleMenu>
  );
}
