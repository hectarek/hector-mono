"use client";

import { FieldError } from "@repo/ui/components/field";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { CloseIcon, SearchIcon } from "@/app/_components/icons";
import { List, ListItem, RowFacts, RowName } from "@/app/_components/list-row";
import { type FoundGames, findGames } from "@/app/actions/admin";
import { catalogLine } from "@/src/entities/game-facts";
import type { Game } from "@/src/entities/models/game.model";
import { coverColorOf } from "@/src/entities/piece";

// How long typing pauses before the search follows it, as the Library's does.
const SETTLE_MS = 250;
// As many matches as show under the field.
const MATCHES_SHOWN = 6;
const NOT_SEARCHED = "Couldn’t search the catalog. Try again.";

// A game in the field: its cover, its title and the line search gives it (B10).
function GameLine({ game }: { game: Game }) {
  const line = catalogLine(game);
  return (
    <>
      <CoverThumb color={coverColorOf(game)} imageUrl={game.imageUrl} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <RowName>{game.title}</RowName>
        {line && <RowFacts>{line}</RowFacts>}
      </span>
    </>
  );
}

// G3's and G4's Expansion of (R1; Hector, 2026-11-25): the kit's search field over the catalog,
// through G5's search, offering the base games it finds, never the game itself. The one picked
// takes the field's place, with Not an expansion to clear it. The form sends the record's type
// and base game from it.
export function BaseGameField({
  label,
  value,
  onChange,
  exceptId,
}: {
  label: ReactNode;
  value: Game | null;
  onChange: (game: Game | null) => void;
  // The record's own game (G4), which can't be its own base game.
  exceptId?: string;
}) {
  const searchId = useId();
  const [text, setText] = useState("");
  // The latest search's matches, with what it searched for.
  const [found, setFound] = useState<{ games: Game[]; for: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Each search's number: an answer that comes back after a newer search started is dropped.
  const asked = useRef(0);
  useEffect(() => () => clearTimeout(settle.current), []);
  // After a pick or Not an expansion, what takes the field's place takes the focus too.
  const moveFocus = useRef(false);
  const takeFocus = (element: HTMLElement | null) => {
    if (element && moveFocus.current) {
      moveFocus.current = false;
      element.focus();
    }
  };

  function search(typed: string) {
    setText(typed);
    clearTimeout(settle.current);
    asked.current += 1;
    const ask = asked.current;
    // One letter matches nothing (SEARCH_MATCH_ABOVE), so the search waits for two.
    if (typed.trim().length < 2) {
      setFound(null);
      setError(null);
      return;
    }
    settle.current = setTimeout(async () => {
      const answer = await findGames(typed).catch(
        (): FoundGames => ({ error: NOT_SEARCHED }),
      );
      if (ask !== asked.current) {
        return;
      }
      if (answer.games === undefined) {
        setFound(null);
        setError(answer.error);
        return;
      }
      setError(null);
      setFound({
        games: answer.games
          .filter((game) => game.type === "base-game" && game.id !== exceptId)
          .slice(0, MATCHES_SHOWN),
        for: typed.trim(),
      });
    }, SETTLE_MS);
  }

  function pick(game: Game) {
    search("");
    moveFocus.current = true;
    onChange(game);
  }

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-13 font-semibold">{label}</span>
        <List>
          <ListItem>
            <GameLine game={value} />
            <button
              ref={takeFocus}
              type="button"
              aria-label="Not an expansion"
              onClick={() => {
                moveFocus.current = true;
                onChange(null);
              }}
              className="-mr-3 flex size-11 shrink-0 items-center justify-center text-foreground hover:text-destructive"
            >
              <CloseIcon />
            </button>
          </ListItem>
        </List>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={searchId} className="text-13 font-semibold">
        {label}
      </label>
      {/* The kit's search field: the edge on a wrapper, a bare input inside, and the focus
          ring on the wrapper. */}
      <div className="flex h-11 items-center gap-2 rounded-lg border-2 border-foreground bg-secondary pl-3 focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-foreground focus-within:outline-dashed">
        <SearchIcon />
        <input
          ref={takeFocus}
          id={searchId}
          type="search"
          value={text}
          onChange={(event) => search(event.target.value)}
          onKeyDown={(event) => {
            // Enter stays in the search, rather than sending the form.
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          className="min-w-0 flex-1 self-stretch bg-transparent text-15 text-foreground focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {text !== "" && (
          <button
            type="button"
            aria-label="Clear the search"
            onClick={() => search("")}
            className="-m-0.5 flex size-11 shrink-0 items-center justify-center text-foreground hover:text-destructive"
          >
            <CloseIcon />
          </button>
        )}
      </div>
      {error && <FieldError>{error}</FieldError>}
      {found &&
        (found.games.length > 0 ? (
          <List>
            {found.games.map((game) => (
              <li key={game.id}>
                <button
                  type="button"
                  onClick={() => pick(game)}
                  className="flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left text-foreground hover:text-destructive focus-visible:-outline-offset-3"
                >
                  <GameLine game={game} />
                </button>
              </li>
            ))}
          </List>
        ) : (
          <p className="text-13 text-muted-foreground">
            No base game called “{found.for}”.
          </p>
        ))}
    </div>
  );
}
