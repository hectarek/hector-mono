// Split into tables (D9; R46, D2, KTD23): the people going, guests included, split among the
// games on the table, or all friends' games when nothing on the table fits. A split uses the
// fewest tables of two or more whose sizes some game fits, with sizes as even as the parties allow, and
// gives each table the best fit for its size, no game twice. The host sits at the first table and
// each guest at their member's; the rest go in the order they answered. A game that seats everyone
// is offered as one table for all instead.
import {
  byBestFit,
  type PlayFit,
  type PlayGame,
  type PlayTime,
  whatToPlay,
} from "./what-to-play";

// A member going and the guests they bring, who sit together.
export type TableParty<P> = { member: P; guests: number };

export type Table<P, G extends PlayGame> = {
  fit: PlayFit<G>;
  parties: TableParty<P>[];
  size: number;
};

export type TableSplits<P, G extends PlayGame> = {
  // The splits that work, the fewest tables first: Try another split moves to the next.
  splits: Table<P, G>[][];
  // A game that seats everyone, best first, or none.
  oneTable: PlayFit<G> | null;
};

// The parties seated in their order, each at the first of `count` tables with room for all of
// them under an even share; a party bigger than the room anywhere sits where most is left, so
// that table is larger.
function seat<P>(
  parties: readonly TableParty<P>[],
  count: number,
): TableParty<P>[][] {
  const total = parties.reduce((sum, party) => sum + 1 + party.guests, 0);
  const share = Math.ceil(total / count);
  const tables: TableParty<P>[][] = Array.from({ length: count }, () => []);
  const taken = Array.from({ length: count }, () => 0);
  for (const party of parties) {
    const need = 1 + party.guests;
    let at = taken.findIndex((seats) => seats + need <= share);
    if (at < 0) {
      at = taken.indexOf(Math.min(...taken));
    }
    tables[at]?.push(party);
    taken[at] = (taken[at] ?? 0) + need;
  }
  return tables;
}

// One split into `count` tables, each with the best game for its size not used at another, or
// null when the parties or the games don't go round.
function splitInto<P, G extends PlayGame>(
  parties: readonly TableParty<P>[],
  games: readonly G[],
  minutes: PlayTime,
  count: number,
): Table<P, G>[] | null {
  const seated = seat(parties, count);
  const used = new Set<string>();
  const tables: Table<P, G>[] = [];
  for (const group of seated) {
    const size = group.reduce((sum, party) => sum + 1 + party.guests, 0);
    if (size < 2) {
      return null;
    }
    const [fit] = whatToPlay(
      games.filter((game) => !used.has(game.id)),
      { people: size, minutes, complexity: null },
    ).fits;
    if (!fit) {
      return null;
    }
    used.add(fit.game.id);
    tables.push({ fit, parties: group, size });
  }
  return tables;
}

function splitsFrom<P, G extends PlayGame>(
  parties: readonly TableParty<P>[],
  games: readonly G[],
  minutes: PlayTime,
): TableSplits<P, G> {
  const total = parties.reduce((sum, party) => sum + 1 + party.guests, 0);
  const splits: Table<P, G>[][] = [];
  for (let count = 2; count <= Math.floor(total / 2); count += 1) {
    const split = splitInto(parties, games, minutes, count);
    if (split) {
      splits.push(split);
    }
  }
  const [oneTable] = whatToPlay(games, {
    people: total,
    minutes,
    complexity: null,
  }).fits.sort(byBestFit);
  return { splits, oneTable: oneTable ?? null };
}

// The splits for the people going (the host's party first, the rest in the order they answered),
// from the games on the table, or from all friends' games when none of those fits.
export function splitTables<P, G extends PlayGame>(
  parties: readonly TableParty<P>[],
  onTable: readonly G[],
  allGames: readonly G[],
  minutes: PlayTime,
): TableSplits<P, G> & { fromTable: boolean } {
  const fromTable = splitsFrom(parties, onTable, minutes);
  if (fromTable.splits.length > 0 || fromTable.oneTable) {
    return { ...fromTable, fromTable: true };
  }
  return { ...splitsFrom(parties, allGames, minutes), fromTable: false };
}
