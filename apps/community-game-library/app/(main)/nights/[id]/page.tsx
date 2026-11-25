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
import { DicePair } from "@/app/_components/dice";
import { Group } from "@/app/_components/group";
import { DownloadIcon, LockIcon, PlaceIcon } from "@/app/_components/icons";
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
import { isUpcoming } from "@/src/entities/night";
import {
  formatClock,
  formatDate,
  formatTime,
  formatTimes,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";
import { CancelNight } from "./cancel-night";
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
    <p data-ink="smudge" className="text-xs">
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

// Who a cancelled night tells, in its dialog (D11): everyone going, invited or waiting.
const TOLD: readonly NightPage["list"][number]["status"][] = [
  "going",
  "invited",
  "waitlisted",
];

// A night that's over: "5 came", or "4 were going" when it was cancelled.
function overWords(cancelled: boolean, taken: number): string {
  if (!cancelled) {
    return `${taken} came`;
  }
  return `${taken} ${taken === 1 ? "was" : "were"} going`;
}

// A game night's page (D2, D4, D7, D13; R30, R31, R36): its details, with the place and address
// for whoever can see the night. The host gets D7: the night's link for a night only invited
// people see, who's going and who hasn't answered, the waitlist with Remove, and Invite people and
// Edit. Anyone else gets D2's details with the seats, and their answer: D2's three, D4's waitlist
// when it's full, D13's once going. Both get the games on the table with I'd play and I'll bring a
// game once going, What should we play? and tables (U20), and Add to my calendar (U21); the host
// gets Cancelling, with D11's dialog. A night whose day has gone, or that's cancelled, only says
// what it was: who came or was going, and the games on its table (D12).
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
  const cancelled = night.cancelledAt !== null;
  const over = cancelled || !isUpcoming(night.startsAt, today);
  const choices =
    page.canBring && !over
      ? await getInjection("IGetNightGameChoicesController")(user.id)
      : null;
  const isHost = page.you === "host";
  const taken = night.capacity - page.seatsOpen;
  const day = formatDate(todayIn(PLAN_TIME_ZONE, night.startsAt), today);
  const host = (await headers()).get("host") ?? "communitygamelibrary.com";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const mine = page.going.find((one) => one.userId === user.id);
  const place =
    page.waitlist.findIndex((one) => one.userId === user.id) + 1 || null;
  const calendarHref = `/nights/${night.id}/calendar`;

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/nights", label: "Nights" }} />}
    >
      <section className="flex flex-col gap-2.5 rounded-lg border-2 border-foreground bg-card p-3.5">
        <div className="flex flex-col items-start gap-1">
          {cancelled ? (
            <Stamp tone="brown" tilt={-3}>
              Cancelled
            </Stamp>
          ) : !over && page.you === null && page.seatsOpen === 0 ? (
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
        {isHost && night.linkToken && !over && (
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
            <Seats
              people={seatedPeople(page.going)}
              open={over ? 0 : page.seatsOpen}
            />
            <span className="font-mono text-13 font-medium">
              {over
                ? overWords(cancelled, taken)
                : `${taken} of ${night.capacity} going${
                    page.seatsOpen > 0
                      ? ` · ${page.seatsOpen} ${page.seatsOpen === 1 ? "seat" : "seats"} open`
                      : ""
                  }`}
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
        <Group
          label={
            over
              ? overWords(cancelled, taken)
              : `Going · ${taken} of ${night.capacity}`
          }
          overList
        >
          <AttendeeList
            going={page.going}
            hostId={night.createdBy}
            viewerId={user.id}
          />
          {over ? null : page.list.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nobody’s invited yet.</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="secondary"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/nights/${night.id}/invite`}
                      transitionTypes={["go-deeper"]}
                    />
                  }
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

      {isHost && !over && page.waitlist.length > 0 && (
        <Group label={`Waitlist · ${page.waitlist.length}`} overList>
          <NightWaitlist gameNightId={night.id} waitlist={page.waitlist} />
        </Group>
      )}

      {!isHost && !over && (
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
            calendarHref,
          }}
        />
      )}

      <TableGames
        page={page}
        userId={user.id}
        choices={choices}
        whatToPlay={!isHost && !over}
        over={over}
      />

      {isHost && !over && (
        <Group label="What you can do">
          <Button
            size="lg"
            nativeButton={false}
            render={
              <Link
                href={`/nights/${night.id}/invite`}
                transitionTypes={["go-deeper"]}
              />
            }
          >
            Invite people
          </Button>
          {/* As D7 draws them: What should we play? with its dice and Add to my calendar take
              the room, Split into tables and Edit keep their own width. */}
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              className="min-h-12 flex-1"
              nativeButton={false}
              render={
                <Link
                  href={`/nights/${night.id}/what-to-play`}
                  transitionTypes={["go-deeper"]}
                />
              }
            >
              <DicePair onBone size="button" />
              <span className="text-left leading-tight whitespace-normal">
                What should we play?
              </span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="min-h-12 shrink-0"
              nativeButton={false}
              render={
                <Link
                  href={`/nights/${night.id}/tables`}
                  transitionTypes={["go-deeper"]}
                />
              }
            >
              Split into tables
            </Button>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              className="flex-1"
              nativeButton={false}
              render={<a href={calendarHref} />}
            >
              <DownloadIcon data-icon="inline-start" />
              Add to my calendar
            </Button>
            <Button
              variant="secondary"
              className="shrink-0"
              nativeButton={false}
              render={
                <Link
                  href={`/nights/${night.id}/edit`}
                  transitionTypes={["go-deeper"]}
                />
              }
            >
              Edit
            </Button>
          </div>
        </Group>
      )}

      {isHost && !over && (
        <CancelNight
          gameNightId={night.id}
          title={night.title}
          day={day}
          when={`${day} · ${formatTime(night.startsAt)}`}
          told={page.list
            .filter((one) => TOLD.includes(one.status))
            .map((one) => one.name)}
        />
      )}
    </PageColumn>
  );
}
