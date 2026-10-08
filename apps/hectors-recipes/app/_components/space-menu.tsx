"use client";

import { Button } from "@repo/ui/components/button";
import { ChevronLeft, Pencil, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState, useTransition } from "react";
import { RenameSpaceForm } from "@/app/_components/rename-space-form";
import { ShareLinkButton } from "@/app/_components/share-link-button";
import { TitleMenu } from "@/app/_components/title-menu";
import { type InviteLinksState, inviteLinks } from "@/app/actions/spaces";
import type { SpaceRole } from "@/src/entities/models/space.model";

// A book or plan's ⋯ sheet (D42): Invite and Rename for the owner (D20, D83), Members, and
// the tab's own actions. Invite turns the sheet into the two links, fetched then, because iOS
// opens the share sheet only straight from a tap, never after an await: each later tap only
// shares. Rename turns it into the name's box, as on Members.
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
  const [renaming, setRenaming] = useState(false);
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
      title={
        inviting
          ? `Invite to ${space.name}`
          : renaming
            ? `Rename ${space.name}`
            : space.name
      }
      description={
        inviting
          ? `Pick what they can do, then send the link. Whoever opens it and signs in joins the ${contents}.`
          : undefined
      }
      onOpenChange={(open) => {
        if (!open) {
          setInviting(false);
          setRenaming(false);
        }
      }}
    >
      {renaming ? (
        <>
          <RenameSpaceForm spaceId={space.id} name={space.name} />
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setRenaming(false)}
          >
            <ChevronLeft data-icon="inline-start" />
            Back
          </Button>
        </>
      ) : inviting ? (
        <>
          <ShareLinkButton
            path={tokens && `/join/${tokens.editor}`}
            title={`Join ${space.name}`}
            label={{
              share: "Share a link to edit",
              copy: "Copy a link to edit",
            }}
            pending={isPending}
            variant="default"
          />
          <ShareLinkButton
            path={tokens && `/join/${tokens.viewer}`}
            title={`Join ${space.name}`}
            label={{
              share: "Share a view-only link",
              copy: "Copy a view-only link",
            }}
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
          {space.role === "owner" && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setRenaming(true)}
            >
              <Pencil data-icon="inline-start" />
              Rename
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
