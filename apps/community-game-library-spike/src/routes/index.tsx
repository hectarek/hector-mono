import { Title } from "@solidjs/meta";
import { useSearchParams } from "@solidjs/router";
import { createMemo, For, Show } from "solid-js";
import { GameRow } from "@/src/components/game-row";
import { searchGames } from "@/src/lib/catalog";

// B10, cut down for the spike: one group of results from the catalog.
export default function Library() {
  const [search, setSearch] = useSearchParams();
  const text = () => (typeof search.q === "string" ? search.q : "");
  const results = createMemo(() => searchGames(text()));

  return (
    <main class="page">
      <Title>Library · Game Library</Title>
      <h1 class="screen-title">Library</h1>
      <form
        class="search"
        method="get"
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("q");
          setSearch({ q: typeof value === "string" ? value.trim() : "" });
        }}
      >
        <label class="field-label" for="q">
          Search the catalog
        </label>
        <input
          class="field"
          id="q"
          name="q"
          type="search"
          value={text()}
          autocomplete="off"
        />
        <button class="button" type="submit">
          Search
        </button>
      </form>
      <Show
        when={text()}
        fallback={<p class="empty">Type a game's name to find it.</p>}
      >
        <section class="panel" aria-labelledby="results-label">
          <h2 class="section-label" id="results-label">
            Games
          </h2>
          <Show
            when={results().length > 0}
            fallback={
              <p class="empty">
                No game matches “{text()}”. Check the spelling, or try fewer
                words.
              </p>
            }
          >
            <ul class="rows">
              <For each={results()}>{(game) => <GameRow game={game} />}</For>
            </ul>
          </Show>
        </section>
      </Show>
    </main>
  );
}
