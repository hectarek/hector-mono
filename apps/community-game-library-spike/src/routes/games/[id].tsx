import { Title } from "@solidjs/meta";
import type { RouteDefinition, RouteProps } from "@solidjs/router";
import { createMemo, For, Show } from "solid-js";
import { AskToBorrowSheet } from "@/src/components/ask-to-borrow-sheet";
import { gameFacts } from "@/src/components/game-row";
import type { Game } from "@/src/entities/game";
import { getGame } from "@/src/lib/catalog";

export const route = {
  preload: ({ params }) => {
    void getGame(params.id ?? "");
  },
} satisfies RouteDefinition;

// B5, cut down for the spike: the cover, the facts the game has, players as dice, About.
export default function GamePage(props: RouteProps<"/games/:id">) {
  const game = createMemo(() => getGame(props.params.id ?? ""));

  return (
    <main class="page">
      <a class="back" href="/">
        ‹ Library
      </a>
      <Show
        when={game()}
        fallback={<p class="empty">That game isn't in the catalog.</p>}
      >
        {(found) => (
          <>
            <Title>{`${found().title} · Game Library`}</Title>
            <div class="cover" aria-hidden="true">
              <span class="cover-title">{found().title}</span>
            </div>
            <h1 class="page-title">{found().title}</h1>
            <ul class="facts">
              <Show when={gameFacts(found())}>
                <li>{gameFacts(found())}</li>
              </Show>
              <Show when={found().minAge}>
                <li>Age {found().minAge}+</li>
              </Show>
              <Show when={found().complexity}>
                <li>Complexity: {found().complexity}</li>
              </Show>
              <Show when={found().year}>
                <li>{found().year}</li>
              </Show>
            </ul>
            <AskToBorrowSheet title={found().title} />
            <Show when={playerCounts(found()).length > 0}>
              <section class="panel" aria-labelledby="players-label">
                <h2 class="section-label" id="players-label">
                  Players
                </h2>
                <div class="dice">
                  <For each={playerCounts(found())}>
                    {(seat) => (
                      <span
                        class={seat.best ? "die best" : "die"}
                        title={seat.best ? `Best at ${seat.count}` : undefined}
                      >
                        {seat.count}
                      </span>
                    )}
                  </For>
                </div>
              </section>
            </Show>
            <Show when={found().description}>
              <section class="panel" aria-labelledby="about-label">
                <h2 class="section-label" id="about-label">
                  About
                </h2>
                <p class="body">{found().description}</p>
              </section>
            </Show>
          </>
        )}
      </Show>
    </main>
  );
}

function playerCounts(game: Game): { count: number; best: boolean }[] {
  if (game.minPlayers === null || game.maxPlayers === null) return [];
  const best = new Set(game.bestPlayers ?? []);
  const counts: { count: number; best: boolean }[] = [];
  for (let count = game.minPlayers; count <= game.maxPlayers; count++) {
    counts.push({ count, best: best.has(count) });
  }
  return counts;
}
