import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { AttendeeList } from "@/app/_components/attendee-list";
import { Group } from "@/app/_components/group";
import { LockIcon, PlaceIcon } from "@/app/_components/icons";
import {
  guestWords,
  hostWords,
  NightStamp,
  seatedPeople,
} from "@/app/_components/night-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Seats } from "@/app/_components/seats";
import { gate } from "@/app/_lib/account";
import { tableLine } from "@/src/entities/game-facts";
import { listed } from "@/src/entities/listed";
import {
  formatDate,
  formatTimes,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";
import { loadNight } from "./load-night";

type NightPage = Awaited<ReturnType<typeof loadNight>>;

// "Alice’s friends can see it", or "Only people invited can see it" with its lock (D2, D7).
function Audience({ page }: { page: NightPage }) {
  if (page.night.audience === "invited") {
    return (
      <p className="flex items-center gap-2 text-sm">
        <LockIcon />
        Only people invited can see it
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      {page.you === "host" ? "Your" : `${page.host.name}’s`} friends can see it
    </p>
  );
}

// A game night's page (D2, D7; R30, R36): its details, with the place and address for whoever can
// see the night, then who's going and the games on the table. The host gets D7, with who's going
// listed by name and Edit; everyone else gets D2's details, with the seats and who said maybe.
// U19 adds answering, the night's link, invites and the waitlist, U20 What should we play? and
// tables, and U21 the calendar file and cancelling.
export default async function NightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const page = await loadNight(id, user.id);
  const today = todayIn(PLAN_TIME_ZONE);
  const { night } = page;
  const isHost = page.you === "host";
  const taken = night.capacity - page.seatsOpen;
  const guests = guestWords(page.going);

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/nights", label: "Nights" }} />}
    >
      <section className="flex flex-col gap-2.5 rounded-lg border-2 border-foreground bg-card p-3.5">
        <div className="flex flex-col items-start gap-1">
          <NightStamp role={page.you} tilt={-3} />
          <h1 className="mt-1 text-2xl leading-tight font-bold">
            {night.title}
          </h1>
          <p className="font-mono text-13 font-medium">
            {formatDate(todayIn(PLAN_TIME_ZONE, night.startsAt), today)} ·{" "}
            {formatTimes(night.startsAt, night.endsAt)}
          </p>
        </div>
        <p className="flex items-center gap-2 text-sm">
          <PlaceIcon />
          {night.address ? `${night.place} · ${night.address}` : night.place}
        </p>
        {!isHost && (
          <p className="flex items-center gap-2 text-sm">
            <span className="flex w-5 shrink-0 justify-center">
              <Piece
                shape={page.host.pieceShape}
                color={page.host.pieceColor}
                size={16}
              />
            </span>
            {hostWords(page)}
          </p>
        )}
        {!isHost && night.hostNote && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            “{night.hostNote}”
          </p>
        )}
        <Audience page={page} />
        {!isHost && (
          <div className="flex flex-col gap-1.5 border-t-2 border-dashed border-foreground pt-3">
            <Seats people={seatedPeople(page.going)} open={page.seatsOpen} />
            <span className="font-mono text-13 font-medium">
              {taken} of {night.capacity} going ·{" "}
              {page.seatsOpen === 0
                ? "Full"
                : `${page.seatsOpen} ${page.seatsOpen === 1 ? "seat" : "seats"} open`}
            </span>
            <span className="text-13 text-muted-foreground">
              {listed(
                page.going.map((one) =>
                  one.userId === user.id ? "You" : one.name,
                ),
              )}
              {guests && ` · ${guests}`}
            </span>
            {page.maybe.length > 0 && (
              <span className="flex items-center gap-1.25 text-xs text-muted-foreground">
                {page.maybe.map((one) => (
                  <Piece
                    key={one.userId}
                    shape={one.pieceShape}
                    color={one.pieceColor}
                    size={11}
                  />
                ))}
                {listed(page.maybe.map((one) => one.name))} said maybe
              </span>
            )}
          </div>
        )}
      </section>

      {isHost && (
        <Group label={`Going · ${taken} of ${night.capacity}`} overList>
          <AttendeeList
            going={page.going}
            hostId={night.createdBy}
            viewerId={user.id}
          />
        </Group>
      )}

      <Group label="Games on the table">
        {page.games.length === 0 ? (
          <p className="text-13 text-muted-foreground">
            No games on the table yet.
          </p>
        ) : (
          <ul className="flex flex-col *:border-dashed *:border-foreground *:not-first:border-t-2">
            {page.games.map(({ userGameId, game, owner }) => (
              <li key={userGameId} className="flex flex-col gap-0.75 py-2.5">
                <span className="text-15 font-bold">{game.title}</span>
                <span className="font-mono text-2xs font-medium text-muted-foreground">
                  {tableLine(game)}
                </span>
                <span className="flex items-center gap-1.25 text-xs">
                  <Piece
                    shape={owner.pieceShape}
                    color={owner.pieceColor}
                    size={11}
                  />
                  {owner.userId === user.id
                    ? "You bring it"
                    : `${owner.name} brings it`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Group>

      {isHost && (
        <Group label="What you can do">
          <Button
            variant="secondary"
            nativeButton={false}
            render={<Link href={`/nights/${night.id}/edit`} />}
          >
            Edit
          </Button>
        </Group>
      )}
    </PageColumn>
  );
}
