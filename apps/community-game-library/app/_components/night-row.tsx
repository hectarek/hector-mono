import Link from "next/link";
import { ForwardIcon } from "@/app/_components/icons";
import { ListRow, RowName } from "@/app/_components/list-row";
import { Piece } from "@/app/_components/piece";
import { Seats } from "@/app/_components/seats";
import { Stamp, type StampTilt, type StampTone } from "@/app/_components/stamp";
import type { DI_RETURN_TYPES } from "@/di/types";
import { listed } from "@/src/entities/listed";
import {
  formatClock,
  formatDate,
  formatTime,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";

export type NightCardData = Awaited<
  ReturnType<DI_RETURN_TYPES["IListNightsController"]>
>[number];
type NightRole = NightCardData["you"];

// The member's own place on a night, in its stamp (screens.md rule 7): red while their answer is
// awaited, navy when they're set, brown while they wait or stay away.
const STAMPS: Record<
  Exclude<NightRole, null>,
  { word: string; tone: StampTone }
> = {
  host: { word: "Host", tone: "navy" },
  invited: { word: "Invited", tone: "red" },
  going: { word: "Going", tone: "navy" },
  maybe: { word: "Maybe", tone: "brown" },
  "cant-go": { word: "Can’t go", tone: "brown" },
  waitlisted: { word: "Waitlist", tone: "brown" },
};

export function NightStamp({
  role,
  size,
  tilt,
}: {
  role: NightRole;
  size?: "row" | "card";
  tilt?: StampTilt;
}) {
  if (role === null) {
    return null;
  }
  const { word, tone } = STAMPS[role];
  return (
    <Stamp tone={tone} size={size} tilt={tilt}>
      {word}
    </Stamp>
  );
}

// "Alice is hosting", or "You’re hosting".
export function hostWords(card: Pick<NightCardData, "host" | "you">): string {
  return card.you === "host"
    ? "You’re hosting"
    : `${card.host.name} is hosting`;
}

// The seats' line on a card (D1): "2 seats open", "Full · 1 on the waitlist", or, for someone who
// could join it, "Full · you can join the waitlist".
function seatsLine(
  card: Pick<NightCardData, "seatsOpen" | "waitlisted" | "you">,
): string {
  if (card.seatsOpen > 0) {
    return `${card.seatsOpen} ${card.seatsOpen === 1 ? "seat" : "seats"} open`;
  }
  if (card.waitlisted > 0) {
    return `Full · ${card.waitlisted} on the waitlist`;
  }
  return card.you === "host" || card.you === "going"
    ? "Full"
    : "Full · you can join the waitlist";
}

// Whose guests the seats show, since a guest is always named (screens.md rule 9): "Ben’s guest",
// "Ben’s 2 guests", "Ben’s and Dev’s guests".
function guestWords(going: NightCardData["going"]): string | null {
  const bringing = going.filter((one) => one.guestCount > 0);
  const [only] = bringing;
  if (!only) {
    return null;
  }
  if (bringing.length === 1) {
    return only.guestCount === 1
      ? `${only.name}’s guest`
      : `${only.name}’s ${only.guestCount} guests`;
  }
  return `${listed(bringing.map((one) => `${one.name}’s`))} guests`;
}

export function seatedPeople(going: NightCardData["going"]) {
  return going.map((one) => ({
    id: one.userId,
    shape: one.pieceShape,
    color: one.pieceColor,
    guests: one.guestCount,
  }));
}

// A night coming up on Nights (D1): its title and the member's stamp, its day and start, who's
// hosting, the seats with their guests named, and how many are open. The whole card opens the
// night, its one home (rule 1).
export function NightCard({
  card,
  today,
  tilt,
}: {
  card: NightCardData;
  today: string;
  tilt?: StampTilt;
}) {
  const { night, host, going, seatsOpen } = card;
  const guests = guestWords(going);
  return (
    <Link
      href={`/nights/${night.id}`}
      transitionTypes={["go-deeper"]}
      className="flex flex-col gap-2 rounded-lg border-2 border-foreground bg-card px-3.5 py-3 text-foreground hover:text-destructive focus-visible:-outline-offset-3"
    >
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 text-base font-bold">{night.title}</h3>
        <NightStamp role={card.you} tilt={tilt} />
        <ForwardIcon />
      </div>
      <p className="font-mono text-13 font-medium">
        {formatDate(todayIn(PLAN_TIME_ZONE, night.startsAt), today)} ·{" "}
        {formatClock(night.startsAt)}
      </p>
      <p className="flex items-center gap-2 text-sm">
        <Piece shape={host.pieceShape} color={host.pieceColor} size={16} />
        {hostWords(card)}
      </p>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-end gap-1.25">
          <Seats
            people={seatedPeople(going)}
            open={seatsOpen}
            max={12}
            size="card"
          />
          {guests && (
            <span className="ml-px font-mono text-2xs font-medium text-muted-foreground">
              {guests}
            </span>
          )}
        </div>
        <span className="font-mono text-13 font-medium">{seatsLine(card)}</span>
      </div>
    </Link>
  );
}

// A night on a friend's page (E3): its title, then its day and start and who's hosting.
export function NightRow({
  card,
  today,
}: {
  card: NightCardData;
  today: string;
}) {
  const { night, host } = card;
  return (
    <ListRow href={`/nights/${night.id}`}>
      <RowName>{night.title}</RowName>
      <span className="flex flex-wrap items-center gap-1.25 font-mono text-2xs font-medium text-muted-foreground">
        {formatDate(todayIn(PLAN_TIME_ZONE, night.startsAt), today)} ·{" "}
        {formatTime(night.startsAt)} ·
        <Piece shape={host.pieceShape} color={host.pieceColor} size={11} />
        {hostWords(card)}
      </span>
    </ListRow>
  );
}
