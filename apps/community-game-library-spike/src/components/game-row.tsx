import { Show } from "solid-js";
import type { Game } from "@/src/entities/game";

type Facts = Pick<
  Game,
  "minPlayers" | "maxPlayers" | "minMinutes" | "maxMinutes"
>;

// screens.md rule 14: a row shows only the facts the game has.
export function gameFacts(game: Facts): string {
  const players = range(game.minPlayers, game.maxPlayers);
  const minutes = range(game.minMinutes, game.maxMinutes);
  return [players, minutes ? `${minutes} min` : null]
    .filter(Boolean)
    .join(" · ");
}

function range(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min === null || max === null || min === max) return String(min ?? max);
  return `${min}–${max}`;
}

export function GameRow(props: { game: Game }) {
  return (
    <li class="row">
      <a class="row-link" href={`/games/${props.game.id}`}>
        <span class="cover-thumb" aria-hidden="true">
          {props.game.title.charAt(0)}
        </span>
        <span>
          <span class="name">{props.game.title}</span>
          <span class="fact">{gameFacts(props.game)}</span>
        </span>
        <Show when={props.game.type === "expansion"}>
          <span class="stamp">Expansion</span>
        </Show>
      </a>
    </li>
  );
}
