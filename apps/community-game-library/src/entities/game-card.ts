import type { CopyStamp, CopyState } from "@/src/entities/loan";
import type { Loan } from "@/src/entities/models/loan.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { formatMonthDay } from "@/src/entities/week";

// One copy behind a game's card: whose it is, whether it's lent, and its state for the person
// looking (loan.ts's copyState).
export type CardCopy = {
  copy: { userId: string; lendable: boolean };
  state: CopyState<Loan>;
};

// A game's card in a list (R11, B1, B10): whose copies, one line of state, and the person
// looking's own stamp (rule 7).
export type GameCard = {
  // Yours first, then your friends' in the order their copies came (B1's "Yours and Jo’s",
  // "Sam’s and Alice’s"); the owner line names the first few.
  owners: NameAndPiece[];
  ownerLine: string;
  stateLine: string;
  stamp: CopyStamp;
};

const brown = (word: string): CopyStamp => ({ word, tone: "brown" });
const outTo = (loan: Loan): CopyStamp =>
  brown(loan.dueOn === null ? "Out" : `Out to ${formatMonthDay(loan.dueOn)}`);

// Your own loans first, the one you hold before the ones you wait on.
const YOUR_LOANS: readonly CopyState<Loan>["kind"][] = [
  "you-have-it",
  "to-pick-up",
  "handed-to-you",
  "you-asked",
  "in-line",
];
// Then your own copy that someone has, has asked for, or has been said yes to.
const YOUR_COPY: readonly CopyState<Loan>["kind"][] = [
  "out",
  "requested",
  "promised",
];

function ownerLine(owners: readonly NameAndPiece[], viewerId: string): string {
  const names = owners.map((owner) =>
    owner.userId === viewerId ? "Yours" : `${owner.name}’s`,
  );
  if (names.length > 3) {
    return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
  }
  return names.length < 2
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

// The card B1 draws for each of the cast's games, as one rule: something of yours decides it,
// then your own copy's news, then how many copies are free now ("1 of 2 available").
export function gameCard(
  copies: readonly CardCopy[],
  people: Record<string, NameAndPiece>,
  viewerId: string,
): GameCard {
  const ownerIds = [
    ...new Set([
      ...copies
        .filter(({ copy }) => copy.userId === viewerId)
        .map(({ copy }) => copy.userId),
      ...copies.map(({ copy }) => copy.userId),
    ]),
  ];
  const owners = ownerIds.flatMap((id) => people[id] ?? []);
  const named = owners.length > 3 ? owners.slice(0, 2) : owners;
  const card = (stateLine: string, stamp: CopyStamp): GameCard => ({
    owners: named,
    ownerLine: ownerLine(owners, viewerId),
    stateLine,
    stamp,
  });
  const nameOf = (loan: Loan | null | undefined) =>
    (loan && people[loan.borrowerUserId]?.name) ?? "Someone";

  for (const kind of YOUR_LOANS) {
    const found = copies.find(({ state }) => state.kind === kind);
    if (!found) {
      continue;
    }
    const { state } = found;
    switch (kind) {
      case "you-have-it":
        return card("You have it", state.stamp);
      case "to-pick-up":
        return card(
          `${people[found.copy.userId]?.name ?? "They"} said yes`,
          state.stamp,
        );
      case "handed-to-you":
        return card(
          `${nameOf(state.holder)} is handing it to you`,
          state.stamp,
        );
      case "you-asked":
        return card("No answer yet", state.stamp);
      case "in-line":
        // Your place is the line; the stamp is the copy's, as B1's Fenwick Fair.
        return card(
          `You’re ${state.stamp.word}`,
          state.holder ? outTo(state.holder) : brown("Asked for"),
        );
    }
  }

  for (const kind of YOUR_COPY) {
    const found = copies.find(
      ({ state }) => state.yours && state.kind === kind,
    );
    if (!found) {
      continue;
    }
    const { state } = found;
    const [first] = state.line;
    switch (kind) {
      case "out":
        return card(
          `${nameOf(state.holder)} has it${state.line.length > 0 ? ` · ${state.line.length} in line` : ""}`,
          state.stamp,
        );
      case "requested":
        return card(
          `${nameOf(first)} asked for it${state.line.length > 1 ? ` · ${state.line.length - 1} more in line` : ""}`,
          state.stamp,
        );
      case "promised":
        return card(`You said yes to ${nameOf(state.promised)}`, state.stamp);
    }
  }

  const free = copies.filter(
    ({ copy, state }) =>
      copy.lendable && state.holder === null && state.promised === null,
  ).length;
  if (free > 0) {
    return card(`${free} of ${copies.length} available`, {
      word: "Available",
      tone: "navy",
    });
  }
  if (copies.every(({ copy }) => !copy.lendable)) {
    return card("Kept at home", brown("Not lent"));
  }
  // Every lent copy is out or spoken for: the one back soonest.
  const back = copies
    .flatMap(({ state }) => (state.holder ? [state.holder] : []))
    .sort((a, b) => ((a.dueOn ?? "9999") < (b.dueOn ?? "9999") ? -1 : 1))[0];
  if (back) {
    return card(
      back.dueOn === null ? "Out" : `Out until ${formatMonthDay(back.dueOn)}`,
      outTo(back),
    );
  }
  return card(`0 of ${copies.length} available`, brown("Asked for"));
}
