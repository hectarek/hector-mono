import type { ReactNode } from "react";
import { PhoneIcon } from "@/app/_components/icons";
import { Piece } from "@/app/_components/piece";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { daysBetween, formatDate, formatWhen } from "@/src/entities/week";

// The parts a loan's page builds its boards from (C2, C3, C5, C7, C16, C17).

export function Title({ children }: { children: string }) {
  return (
    <h1 className="text-2xl leading-7 font-bold wrap-break-word">{children}</h1>
  );
}

// The game's token, a lead line in bold, and facts in mono under it.
export function Summary({
  thumb,
  piece,
  lead,
  facts,
}: {
  thumb: ReactNode;
  // A person's 20px piece between the token and the words (C5, C7).
  piece?: ReactNode;
  lead: string;
  facts: string[];
}) {
  return (
    <div className="flex items-center gap-3">
      {thumb}
      {piece}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-15 font-bold">{lead}</span>
        {facts.map((fact) => (
          <span
            key={fact}
            className="font-mono text-2xs font-medium text-muted-foreground"
          >
            {fact}
          </span>
        ))}
      </div>
    </div>
  );
}

// A person's phone, which the other person in an open loan sees, friends or not (R40).
export function PhoneLink({ name, phone }: { name: string; phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
      aria-label={`Call ${name}, ${phone}`}
      className="flex min-h-11 shrink-0 items-center gap-1.5 font-mono text-13 font-medium text-foreground hover:text-destructive"
    >
      <PhoneIcon />
      <span className="border-b-2 border-dashed border-current pb-px">
        {phone}
      </span>
    </a>
  );
}

// The other person in the loan: their piece and name, why they're here, and their phone.
export function Person({
  person,
  line,
}: {
  person: NameAndPiece & { phone: string | null };
  line: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Piece shape={person.pieceShape} color={person.pieceColor} size={20} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-15 font-bold">{person.name}</span>
        {line && <span className="text-xs text-muted-foreground">{line}</span>}
      </div>
      {person.phone && <PhoneLink name={person.name} phone={person.phone} />}
    </div>
  );
}

// C2's asker: their piece and name, their note, and when they asked.
export function Asker({
  person,
  note,
  asked,
}: {
  person: NameAndPiece;
  note: string | null;
  asked: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Piece shape={person.pieceShape} color={person.pieceColor} size={20} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-15 font-bold">{person.name}</span>
        {note && <span className="text-15">“{note}”</span>}
        <span className="font-mono text-2xs font-medium text-muted-foreground">
          Asked {asked}
        </span>
      </div>
    </div>
  );
}

// "20 min ago" within the hour, as C2 says it, then C16's "this morning".
export function askedWhen(at: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000);
  return minutes < 60 ? `${Math.max(minutes, 1)} min ago` : formatWhen(at, now);
}

// A yes's period in words (R16): 1 week, 2 weeks, a month.
const PERIOD_WORDS: Partial<Record<number, string>> = {
  7: "1 week",
  14: "2 weeks",
  30: "a month",
};

export function periodWords(days: number | null): string {
  return days === null ? "" : (PERIOD_WORDS[days] ?? `${days} days`);
}

// A note as a sentence, with its full stop, whether its writer typed one or not.
export const asSentence = (note: string) =>
  /[.!?]$/.test(note) ? note : `${note}.`;

export const capitalized = (words: string) =>
  `${words.charAt(0).toUpperCase()}${words.slice(1)}`;

// A loan's dates once it's picked up, in mono under the track (C5, C7): "Picked up Fri, Nov 6 ·
// 1 week · due Fri, Nov 13". The period shows only while the due date is still the one it gives:
// more time, a new date or a call-back leave just the two dates.
export function datesLine(
  loan: {
    pickedUpOn: string | null;
    periodDays: number | null;
    dueOn: string | null;
  },
  today: string,
): string {
  const period =
    loan.pickedUpOn &&
    loan.dueOn &&
    daysBetween(loan.pickedUpOn, loan.dueOn) === loan.periodDays
      ? periodWords(loan.periodDays)
      : null;
  return [
    loan.pickedUpOn && `Picked up ${formatDate(loan.pickedUpOn, today)}`,
    period,
    loan.dueOn && `due ${formatDate(loan.dueOn, today)}`,
  ]
    .filter((part) => part)
    .join(" · ");
}
