// What should we play? (D8; R37 as revised, D2, KTD23): readable rules over the games' facts, each
// answer with its reason. A game fits when it plays at that many people, its time is within the
// time we have, and its complexity is the one picked; a game missing a value a rule needs doesn't
// fit, and is left out with that reason (rule 14). Best fits first: games that play best at that
// many people, then those that play at it, then more votes for games on the table, then
// popularity, then the title.
import type { Game } from "./models/game.model";

// D8's choices of time, in minutes: 1 hour, 90 minutes, 2 hours, 3 hours.
const PLAY_TIMES = [60, 90, 120, 180] as const;
export type PlayTime = (typeof PLAY_TIMES)[number];

// D8's complexity, where New players means light (KTD23).
const PLAY_COMPLEXITIES = ["light", "medium", "heavy", "new-players"] as const;
export type PlayComplexity = (typeof PLAY_COMPLEXITIES)[number];

// A game as the rules read it: its facts, whether it's on the night's table, and how many there
// said they'd play it.
export type PlayGame = Pick<
  Game,
  | "id"
  | "title"
  | "minPlayers"
  | "maxPlayers"
  | "bestPlayers"
  | "minMinutes"
  | "maxMinutes"
  | "complexity"
  | "popularity"
> & { onTable: boolean; votes: number };

export type LookingFor = {
  people: number;
  minutes: PlayTime;
  // None picked means any.
  complexity: PlayComplexity | null;
};

export type PlayFit<T extends PlayGame> = {
  game: T;
  best: boolean;
  // "Plays 6, best at 5"
  players: string;
  // "90 min · medium"
  facts: string;
};

export type LeftOut<T extends PlayGame> = { game: T; reason: string };

// The time a night gives, to start (KTD23): the longest choice that fits its length, or 2 hours
// when it has no end.
export function startingTime(startsAt: Date, endsAt: Date | null): PlayTime {
  if (endsAt === null) {
    return 120;
  }
  const minutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;
  return PLAY_TIMES.filter((time) => time <= minutes).at(-1) ?? 60;
}

// "60–90 min", or "90 min".
export function minutesWords(game: PlayGame): string | null {
  const { minMinutes: low, maxMinutes: high } = game;
  if (low !== null && high !== null) {
    return low === high ? `${low} min` : `${low}–${high} min`;
  }
  const one = low ?? high;
  return one === null ? null : `${one} min`;
}

// What a game says about itself at a size: "Plays 6, best at 5".
function playersWords(game: PlayGame, people: number): string {
  return game.bestPlayers?.length
    ? `Plays ${people}, best at ${game.bestPlayers.join(" or ")}`
    : `Plays ${people}`;
}

// Its time and its complexity, only what it has: "90 min · medium".
function factsWords(game: PlayGame): string {
  return [minutesWords(game), game.complexity]
    .filter((part) => part !== null)
    .join(" · ");
}

// Why a game doesn't fit, or null when it does: the people first, then the time, then the
// complexity.
function whyNot(game: PlayGame, looking: LookingFor): string | null {
  const { title, minPlayers, maxPlayers } = game;
  if (minPlayers === null || maxPlayers === null) {
    return `${title} has no player count.`;
  }
  if (looking.people > maxPlayers) {
    return minPlayers === maxPlayers
      ? `${title} seats ${maxPlayers}.`
      : `${title} seats ${maxPlayers} at most.`;
  }
  if (looking.people < minPlayers) {
    return `${title} needs ${minPlayers} at least.`;
  }
  const minutes = game.maxMinutes ?? game.minMinutes;
  if (minutes === null) {
    return `${title} has no play time.`;
  }
  if (minutes > looking.minutes) {
    return `${title} takes ${minutes} min.`;
  }
  if (looking.complexity !== null) {
    const wanted =
      looking.complexity === "new-players" ? "light" : looking.complexity;
    if (game.complexity === null) {
      return `${title} has no complexity.`;
    }
    if (game.complexity !== wanted) {
      return `${title} is ${game.complexity}.`;
    }
  }
  return null;
}

// Best fits first (KTD23's order).
export function byBestFit<T extends PlayGame>(
  a: PlayFit<T>,
  b: PlayFit<T>,
): number {
  return (
    Number(b.best) - Number(a.best) ||
    b.game.votes - a.game.votes ||
    (b.game.popularity ?? -1) - (a.game.popularity ?? -1) ||
    (a.game.title < b.game.title ? -1 : a.game.title > b.game.title ? 1 : 0)
  );
}

// The games that fit what we're looking for, best first, and the ones left out, each with why.
export function whatToPlay<T extends PlayGame>(
  games: readonly T[],
  looking: LookingFor,
): { fits: PlayFit<T>[]; leftOut: LeftOut<T>[] } {
  const fits: PlayFit<T>[] = [];
  const leftOut: LeftOut<T>[] = [];
  for (const game of games) {
    const reason = whyNot(game, looking);
    if (reason) {
      leftOut.push({ game, reason });
    } else {
      fits.push({
        game,
        best: game.bestPlayers?.includes(looking.people) ?? false,
        players: playersWords(game, looking.people),
        facts: factsWords(game),
      });
    }
  }
  return { fits: fits.sort(byBestFit), leftOut };
}
