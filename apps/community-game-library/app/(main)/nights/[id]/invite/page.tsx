import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { Group } from "@/app/_components/group";
import { LinkIcon } from "@/app/_components/icons";
import { List, ListItem } from "@/app/_components/list-row";
import { NightStamp } from "@/app/_components/night-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { ShareAndCopy } from "@/app/_components/share-button";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { nightLinkMessage } from "@/src/entities/share-message";
import { loadNight } from "../load-night";
import { InviteForm } from "./invite-form";

// D10's stamps tilt one way, then the other.
const TILTS = [-3, 2, -2, 3] as const;

// Invite people (D10, R30): for the host, or someone going once the host lets them. Not invited
// yet, Already invited with each person's answer, and Or share the link for a night that has one,
// with Share and Copy as every link has them. Anyone else gets Not found.
export default async function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const page = await loadNight(id, user.id);
  if (!page.canInvite) {
    notFound();
  }
  const friends = await getInjection("IGetInviteChoicesController")(
    { gameNightId: id },
    user.id,
  );
  const { night } = page;
  const invited = page.list.filter((one) => one.invitedBy !== null);
  const host = (await headers()).get("host") ?? "communitygamelibrary.com";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const address = night.linkToken ? `${host}/n/${night.linkToken}` : null;

  return (
    <PageColumn
      width="read"
      header={
        <AppHeader back={{ href: `/nights/${night.id}`, label: night.title }} />
      }
    >
      <h1 className="text-2xl leading-7 font-bold">Invite people</h1>
      <InviteForm
        gameNightId={night.id}
        friends={friends}
        full={page.seatsOpen === 0}
        lastWaiting={page.waitlist.at(-1)?.name ?? null}
      />
      {invited.length > 0 && (
        <Group label="Already invited" overList>
          <List>
            {invited.map((one, index) => (
              <ListItem key={one.userId}>
                <Piece
                  shape={one.pieceShape}
                  color={one.pieceColor}
                  size={20}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-15 font-bold">{one.name}</span>
                  {one.guestCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Bringing {one.guestCount}{" "}
                      {one.guestCount === 1 ? "guest" : "guests"}
                    </span>
                  )}
                </span>
                <NightStamp
                  role={one.status}
                  tilt={TILTS[index % TILTS.length]}
                />
              </ListItem>
            ))}
          </List>
        </Group>
      )}
      {address && (
        <Group label="Or share the link">
          <p className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-foreground bg-secondary px-2.5">
            <LinkIcon className="shrink-0" />
            <span className="min-w-0 font-mono text-xs font-medium wrap-anywhere">
              {address}
            </span>
          </p>
          {/* Send invites is the page's main action. */}
          <ShareAndCopy
            text={nightLinkMessage(night.title)}
            url={`${local ? "http" : "https"}://${address}`}
            secondary
          />
          <p className="text-xs text-muted-foreground">
            Anyone who opens this link can see the night and join while there’s
            room. Share it only with people you want there.
          </p>
        </Group>
      )}
    </PageColumn>
  );
}
