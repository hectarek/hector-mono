import { notFound } from "next/navigation";
import { BackLink } from "@/app/_components/back-link";
import { DeleteSpaceButton } from "@/app/_components/delete-space-button";
import { InviteLinks } from "@/app/_components/invite-links";
import { MemberList } from "@/app/_components/member-list";
import { RenameSpaceForm } from "@/app/_components/rename-space-form";
import { RoleBadge } from "@/app/_components/role-badge";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  SPACE_TYPE_CONTENTS,
  SPACE_TYPE_HOME,
  SPACE_TYPE_LABELS,
  spaceHref,
} from "@/app/_lib/space-href";
import { getInjection } from "@/di/container";
import {
  InputParseError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";

async function loadSettings(spaceId: string, userId: string | undefined) {
  try {
    return await getInjection("IGetSpaceSettingsController")(
      { spaceId },
      userId,
    );
  } catch (err) {
    // Non-members get the same 404 as a missing space: don't confirm it exists.
    if (
      err instanceof NotFoundError ||
      err instanceof UnauthorizedError ||
      err instanceof InputParseError
    ) {
      notFound();
    }
    getInjection("ILoggerService")
      .child({ layer: "page", op: "spaceSettings" })
      .error("Failed to load settings", { spaceId, error: String(err) });
    throw err;
  }
}

export default async function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const { space, role, members, invites } = await loadSettings(id, userId);
  const typeLabel = SPACE_TYPE_LABELS[space.type];
  const isOwner = role === "owner";

  return (
    <div className="flex flex-col gap-6">
      <BackLink href={spaceHref(space)} label={space.name} />

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{space.name}</h1>
          <RoleBadge role={role} />
        </div>
        {isOwner && <RenameSpaceForm spaceId={space.id} name={space.name} />}
      </section>

      {isOwner && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Invite links</h2>
          <InviteLinks
            spaceId={space.id}
            spaceName={space.name}
            invites={invites}
          />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Members ({members.length})</h2>
        <MemberList
          spaceId={space.id}
          spaceName={space.name}
          members={members}
          viewerRole={role}
          viewerId={userId ?? ""}
          home={SPACE_TYPE_HOME[space.type]}
        />
      </section>

      {isOwner && (
        <section className="flex flex-col items-start gap-2 border-t pt-6">
          <h2 className="text-base font-semibold">Delete {typeLabel}</h2>
          <DeleteSpaceButton
            spaceId={space.id}
            name={space.name}
            typeLabel={typeLabel}
            contents={SPACE_TYPE_CONTENTS[space.type]}
          />
        </section>
      )}
    </div>
  );
}
