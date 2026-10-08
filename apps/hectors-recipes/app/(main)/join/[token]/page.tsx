import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { BackLink } from "@/app/_components/back-link";
import { JoinButton } from "@/app/_components/join-button";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  SPACE_TYPE_CONTENTS,
  SPACE_TYPE_LABELS,
  spaceHref,
} from "@/app/_lib/space-href";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type { InvitePreview } from "@/src/entities/models/space.model";

export const dynamic = "force-dynamic";

async function loadInvite(token: string): Promise<InvitePreview | null> {
  try {
    return await getInjection("IPreviewInviteController")(
      { token },
      await getCurrentUserId(),
    );
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      return null;
    }
    getInjection("ILoggerService")
      .child({ layer: "page", op: "joinInvite" })
      .error("Failed to load invite", { error: String(err) });
    throw err;
  }
}

// Joining is a button, never automatic: link previews and prefetching load URLs on their own.
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await loadInvite(token);

  if (!invite) {
    return (
      <div className="flex flex-col">
        <BackLink href="/" label="Recipes" />
        <Empty className="my-8">
          <EmptyHeader>
            <EmptyTitle>This invite link isn&apos;t active</EmptyTitle>
            <EmptyDescription>
              It may have been turned off. Ask for a new link.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="lg" nativeButton={false} render={<Link href="/" />}>
              Go to recipes
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const typeLabel = SPACE_TYPE_LABELS[invite.spaceType];
  const href = spaceHref({ id: invite.spaceId, type: invite.spaceType });

  // Not a tab, so it has the way back (D32).
  return (
    <div className="flex flex-col">
      <BackLink href="/" label="Recipes" />
      <Empty className="my-8">
        <EmptyHeader>
          <EmptyTitle>
            {invite.alreadyMember
              ? `You're already in “${invite.spaceName}”`
              : `Join “${invite.spaceName}”`}
          </EmptyTitle>
          <EmptyDescription>
            {invite.alreadyMember
              ? `It's already one of your ${typeLabel}s.`
              : `You've been invited to a shared ${SPACE_TYPE_CONTENTS[invite.spaceType]}. You'll be able to ${
                  invite.role === "editor" ? "view and edit" : "view"
                } it.`}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {invite.alreadyMember ? (
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href={href} />}
            >
              Open {invite.spaceName}
            </Button>
          ) : (
            <JoinButton
              token={token}
              label={`Join ${typeLabel}`}
              askDefault={invite.ownPlanInUse}
            />
          )}
        </EmptyContent>
      </Empty>
    </div>
  );
}
