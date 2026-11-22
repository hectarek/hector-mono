import { RowFacts } from "@/app/_components/list-row";
import { Piece } from "@/app/_components/piece";
import { expansionName } from "@/src/entities/game-facts";
import type { CopyStamp, CopyState } from "@/src/entities/loan";
import type { Loan } from "@/src/entities/models/loan.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { formatDate, formatMonthDay, formatWhen } from "@/src/entities/week";

// A copy's condition in the boards' words (B7's choices, B13's lines).
export const CONDITIONS: Record<UserGame["condition"], string> = {
  "like-new": "Like new",
  good: "Good",
  worn: "Worn",
};

const possessive = (name: string) => `${name}’s`;

// "A, B and C".
const listed = (items: readonly string[]) =>
  items.length < 2
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

// One line under a copy's name: a fact in mono, or words about a person beside their piece.
export type CopyLine =
  | { kind: "fact"; text: string }
  | { kind: "person"; text: string; person: NameAndPiece };

export type CopyWordsInput = {
  copy: UserGame;
  state: CopyState<Loan>;
  owner: NameAndPiece;
  // Everyone the lines can name, by user id.
  people: Record<string, NameAndPiece>;
  // The expansions in its box, by full title, and the title they share in front.
  boxedExpansions: readonly string[];
  baseTitle: string;
  today: string;
  now: Date;
};

// What a copy's row says under its name (B5, B11, B13): where the copy is, who has it or is in
// line, then its condition and the expansions in its box. The stamp is the person looking's own
// status, or "Not lent" (rule 7): a friend's copy that's simply home or out has none, since its
// lines say so.
export function copyWords({
  copy,
  state,
  owner,
  people,
  boxedExpansions,
  baseTitle,
  today,
  now,
}: CopyWordsInput): { lines: CopyLine[]; stamp: CopyStamp | null } {
  const lines: CopyLine[] = [];
  const fact = (text: string) => lines.push({ kind: "fact", text });
  const about = (loan: Loan | null, text: (name: string) => string) => {
    const person = loan && people[loan.borrowerUserId];
    if (person) {
      lines.push({ kind: "person", text: text(person.name), person });
    }
  };
  const home = state.yours ? "At home" : `At ${possessive(owner.name)}`;
  const outUntil = (loan: Loan) =>
    loan.dueOn === null ? "Out" : `Out until ${formatMonthDay(loan.dueOn)}`;
  const [first] = state.line;

  switch (state.kind) {
    case "available":
      fact(home);
      break;
    case "not-lent":
      fact(
        state.yours ? "You keep it at home" : `${owner.name} keeps it at home`,
      );
      break;
    case "requested":
      fact(home);
      about(first ?? null, (name) => `${name} asked for it`);
      break;
    case "promised":
      fact(home);
      about(state.promised, (name) =>
        state.yours ? `You said yes to ${name}` : `${name} is picking it up`,
      );
      break;
    case "out": {
      const holder = state.holder && people[state.holder.borrowerUserId];
      if (state.holder) {
        fact(outUntil(state.holder));
      }
      // B13 names the holder in mono, without a piece: only the next in line stands beside one.
      if (holder) {
        fact(`${holder.name} has it`);
      }
      about(first ?? null, (name) => `${name} is 1st in line`);
      break;
    }
    case "you-asked":
      fact(home);
      if (first) {
        fact(`You asked ${formatWhen(first.createdAt, now)}`);
      }
      break;
    case "in-line":
      fact(state.holder ? outUntil(state.holder) : home);
      break;
    case "to-pick-up":
      fact(home);
      break;
    case "handed-to-you":
      about(state.holder, (name) => `${name} is handing it to you`);
      break;
    case "you-have-it":
      if (state.holder?.status === "returning") {
        fact(`You gave it back to ${owner.name}`);
      } else if (state.holder?.status === "passing") {
        fact("You handed it on");
      } else if (state.holder?.dueOn) {
        fact(`You have it · due ${formatDate(state.holder.dueOn, today)}`);
      } else {
        fact("You have it");
      }
      break;
  }

  // Its condition, then what's in the box: on a line of its own when there's a note, so the
  // condition line stays short (B13's Sam's copy against Jo's).
  const condition = [CONDITIONS[copy.condition], copy.conditionNote]
    .filter((part) => part)
    .join(" · ");
  const inTheBox = listed(
    boxedExpansions.map((title) => expansionName(title, baseTitle)),
  );
  if (inTheBox && copy.conditionNote) {
    fact(condition);
    fact(`With ${inTheBox}`);
  } else {
    fact(inTheBox ? `${condition} · with ${inTheBox}` : condition);
  }

  const quiet =
    state.kind === "available" ||
    (!state.yours &&
      (state.kind === "out" ||
        state.kind === "requested" ||
        state.kind === "promised"));
  return { lines, stamp: quiet ? null : state.stamp };
}

// The lines, as B13 sets them: each fact in mono on one line of its own, and a person's line in
// sans beside their 11px piece, which may wrap.
export function CopyLines({ lines }: { lines: readonly CopyLine[] }) {
  return lines.map((line) =>
    line.kind === "fact" ? (
      <RowFacts key={line.text}>
        <span className="whitespace-nowrap">{line.text}</span>
      </RowFacts>
    ) : (
      <span key={line.text} className="flex items-center gap-1.25 text-xs">
        <Piece
          shape={line.person.pieceShape}
          color={line.person.pieceColor}
          size={11}
        />
        {line.text}
      </span>
    ),
  );
}
