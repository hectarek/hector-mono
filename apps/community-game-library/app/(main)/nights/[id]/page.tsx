import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { AttendeeList } from "@/app/_components/attendee-list";
import { Group } from "@/app/_components/group";
import { LockIcon, PlaceIcon } from "@/app/_components/icons";
import {
  hostWords,
  NightStamp,
  seatedPeople,
} from "@/app/_components/night-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Seats } from "@/app/_components/seats";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { listed } from "@/src/entities/listed";
import {
  formatClock,
  formatDate,
  formatTimes,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";
import { loadNight } from "./load-night";
import { YourAnswer } from "./night-answer";
import { NightLink } from "./night-link";
import { NightWaitlist } from "./night-waitlist";
import { TableGames } from "./table-games";

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

// Who's going, as D4 and D13 write it: "Ben, Alice, Sam, Priya, Jo, Mei, Dev and Dev’s guest",
// with the member last, "and you".
function goingNames(going: NightPage["going"], userId: string): string {
  const named = (name: string, guests: number) =>
    guests === 0
      ? []
      : [guests === 1 ? `${name} guest` : `${name} ${guests} guests`];
  const others = going
    .filter((one) => one.userId !== userId)
    .flatMap((one) => [one.name, ...named(`${one.name}’s`, one.guestCount)]);
  const me = going.find((one) => one.userId === userId);
  return listed(
    me ? [...others, "you", ...named("your", me.guestCount)] : others,
  );
}

// Who hasn't answered an invite by name yet, under the host's Going (D7).
function unanswered(page: NightPage): string {
  const waiting = page.list
    .filter((one) => one.status === "invited" && one.invitedBy !== null)
    .map((one) => one.name);
  if (waiting.length === 0) {
    return "Everyone invited has answered.";
  }
  return `${listed(waiting)} ${waiting.length === 1 ? "hasn’t" : "haven’t"} answered yet.`;
}

// A game night's page (D2, D4, D7, D13; R30, R31, R36): its details, with the place and address
// for whoever can see the night. The host gets D7: the night's link for a night only invited
// people see, who's going and who hasn't answered, the waitlist with Remove, and Invite people and
// Edit. Anyone else gets D2's details with the seats, and their answer: D2's three, D4's waitlist
// when it's full, D13's once going. Both get the games on the table with I'd play and I'll bring a
// game once going. U20 adds What should we play? and tables, and U21 the calendar file and
// cancelling.
export default async function NightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const page = await loadNight(id, user.id);
  const choices = page.canBring
    ? await getInjection("IGetNightGameChoicesController")(user.id)
    : null;
  const today = todayIn(PLAN_TIME_ZONE);
  const { night } = page;
  const isHost = page.you === "host";
  const taken = night.capacity - page.seatsOpen;
  const day = formatDate(todayIn(PLAN_TIME_ZONE, night.startsAt), today);
  const host = (await headers()).get("host") ?? "communitygamelibrary.com";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const mine = page.going.find((one) => one.userId === user.id);
  const place =
    page.waitlist.findIndex((one) => one.userId === user.id) + 1 || null;

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/nights", label: "Nights" }} />}
    >
      <section className="flex flex-col gap-2.5 rounded-lg border-2 border-foreground bg-card p-3.5">
        <div className="flex flex-col items-start gap-1">
          {page.you === null && page.seatsOpen === 0 ? (
            <Stamp tone="brown" tilt={-3}>
              Full
            </Stamp>
          ) : (
            <NightStamp role={page.you} tilt={-3} />
          )}
          <h1 className="mt-1 text-2xl leading-tight font-bold">
            {night.title}
          </h1>
          <p className="font-mono text-13 font-medium">
            {day} · {formatTimes(night.startsAt, night.endsAt)}
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
        {isHost && night.linkToken && (
          <NightLink
            gameNightId={night.id}
            title={night.title}
            address={`${host}/n/${night.linkToken}`}
            url={`${local ? "http" : "https"}://${host}/n/${night.linkToken}`}
            attendeesCanInvite={night.attendeesCanInvite}
          />
        )}
        {!isHost && (
          <div className="flex flex-col gap-1.5 border-t-2 border-dashed border-foreground pt-3">
            <Seats people={seatedPeople(page.going)} open={page.seatsOpen} />
            <span className="font-mono text-13 font-medium">
              {taken} of {night.capacity} going
              {page.seatsOpen > 0 &&
                ` · ${page.seatsOpen} ${page.seatsOpen === 1 ? "seat" : "seats"} open`}
            </span>
            <span className="text-13 text-muted-foreground">
              {goingNames(page.going, user.id)}
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
          {page.list.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nobody’s invited yet.</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="secondary"
                  nativeButton={false}
                  render={<Link href={`/nights/${night.id}/invite`} />}
                >
                  Invite people
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <p className="text-13 text-muted-foreground">{unanswered(page)}</p>
          )}
        </Group>
      )}

      {isHost && page.waitlist.length > 0 && (
        <Group label={`Waitlist · ${page.waitlist.length}`} overList>
          <NightWaitlist gameNightId={night.id} waitlist={page.waitlist} />
        </Group>
      )}

      {!isHost && (
        <YourAnswer
          context={{
            gameNightId: night.id,
            line: `${night.title} · ${day} · ${formatClock(night.startsAt)}`,
            hostName: page.host.name,
            guestsAllowed: night.guestsAllowed,
            attendeesCanInvite: night.attendeesCanInvite,
            you: page.you === "host" ? null : page.you,
            guestCount: mine?.guestCount ?? 0,
            seatsOpen: page.seatsOpen,
            waitlisted: page.waitlisted,
            place,
            canInvite: page.canInvite,
          }}
        />
      )}

      <TableGames
        page={page}
        userId={user.id}
        choices={choices}
        whatToPlay={!isHost}
      />

      {isHost && (
        <Group label="What you can do">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href={`/nights/${night.id}/invite`} />}
          >
            Invite people
          </Button>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              nativeButton={false}
              render={<Link href={`/nights/${night.id}/what-to-play`} />}
            >
              What should we play?
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              nativeButton={false}
              render={<Link href={`/nights/${night.id}/tables`} />}
            >
              Split into tables
            </Button>
          </div>
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
