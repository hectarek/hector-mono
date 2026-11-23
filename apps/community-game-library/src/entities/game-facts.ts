import type { Game } from "@/src/entities/models/game.model";
import { listed } from "./listed";

// A game's facts in the boards' words (B5, B10, B11, Y1), each only when the game has it (rule
// 14): ranges take an en dash, parts are kept apart by a middle dot.
const SEPARATOR = " · ";

function range(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) {
    return min === max ? `${min}` : `${min}–${max}`;
  }
  const one = min ?? max;
  return one === null ? null : `${one}`;
}

// The facts panel, in B5's order: players with the best counts, play time, age, complexity.
export type GameFact =
  | { kind: "players"; text: string }
  | { kind: "minutes"; text: string }
  | { kind: "age"; text: string }
  | { kind: "complexity"; text: string };

export function gameFacts(game: Game): GameFact[] {
  const facts: GameFact[] = [];
  const players = range(game.minPlayers, game.maxPlayers);
  if (players !== null) {
    const noun =
      game.minPlayers === 1 && (game.maxPlayers ?? 1) === 1
        ? "player"
        : "players";
    const best = game.bestPlayers?.length
      ? `${SEPARATOR}best at ${game.bestPlayers.join(" or ")}`
      : "";
    facts.push({ kind: "players", text: `${players} ${noun}${best}` });
  }
  const minutes = range(game.minMinutes, game.maxMinutes);
  if (minutes !== null) {
    facts.push({ kind: "minutes", text: `${minutes} min` });
  }
  if (game.minAge !== null) {
    facts.push({ kind: "age", text: `Age ${game.minAge}+` });
  }
  if (game.complexity !== null) {
    facts.push({ kind: "complexity", text: `Complexity: ${game.complexity}` });
  }
  return facts;
}

// The line under a game's title on its page: "2019 · Tidewater Games · designed by Ines Varga".
export function titleLine(game: Game): string {
  return [
    game.year === null ? null : `${game.year}`,
    game.publishers?.[0] ?? null,
    game.designers?.length ? `designed by ${listed(game.designers)}` : null,
  ]
    .filter((part) => part !== null)
    .join(SEPARATOR);
}

// A catalog row's line in search (B10, R2): the year, then "expansion" or the first publisher, so
// editions and same-named games can be told apart.
export function catalogLine(game: Game): string {
  return [
    game.year === null ? null : `${game.year}`,
    game.type === "expansion" ? "expansion" : (game.publishers?.[0] ?? null),
  ]
    .filter((part) => part !== null)
    .join(SEPARATOR);
}

// An expansion's own name, without its base game's in front: "Gull & Anchor: Low Tide" in a box
// of Gull & Anchor is "Low Tide" (B13; screens.md, In my box).
export function expansionName(title: string, baseTitle: string): string {
  return title.startsWith(`${baseTitle}: `)
    ? title.slice(baseTitle.length + 2)
    : title;
}

// A library card's line (B10, Y1): the players and the play time, "2–5 · 45–60 min".
export function cardLine(game: Game): string {
  const minutes = range(game.minMinutes, game.maxMinutes);
  return [
    range(game.minPlayers, game.maxPlayers),
    minutes === null ? null : `${minutes} min`,
  ]
    .filter((part) => part !== null)
    .join(SEPARATOR);
}
