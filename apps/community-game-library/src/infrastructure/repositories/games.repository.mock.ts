import type {
  GameSearchResults,
  IGamesRepository,
} from "@/src/application/repositories/games.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { Game, GameRecord } from "@/src/entities/models/game.model";
import { SEARCH_MATCH_ABOVE, toSearchTitle } from "@/src/entities/search-title";

// pg_trgm's trigrams of a text, in order: each word (a run of letters and digits) padded with two
// spaces in front and one behind, then every three characters of it.
function trigramsOf(text: string): string[] {
  return text
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0)
    .flatMap((word) => {
      const padded = `  ${word} `;
      return Array.from({ length: padded.length - 2 }, (_, at) =>
        padded.slice(at, at + 3),
      );
    });
}

// pg_trgm's word_similarity(typed, title), ported from iterate_word_similarity in its trgm_op.c so
// the mock ranks and cuts off as the database does: the best stretch of the title's trigrams, by
// the trigrams it shares with what's typed over all the trigrams of either. Like the original, it
// ends a stretch only on a shared trigram and moves its start forward only when that scores
// better.
function wordSimilarity(typed: string, title: string): number {
  const wanted = new Set(trigramsOf(typed));
  const sequence = trigramsOf(title);
  const score = (shared: number, inStretch: number) =>
    shared / (wanted.size + inStretch - shared);
  // Each trigram's last place in the stretch, or -1 once the stretch has moved past it.
  const lastAt = new Map<string, number>();
  let inStretch = 0;
  let shared = 0;
  let start = -1;
  let best = 0;
  sequence.forEach((trigram, end) => {
    const isWanted = wanted.has(trigram);
    if (start >= 0 || isWanted) {
      if ((lastAt.get(trigram) ?? -1) < 0) {
        inStretch++;
        if (isWanted) {
          shared++;
        }
      }
      lastAt.set(trigram, end);
    }
    if (!isWanted) {
      return;
    }
    if (start === -1) {
      start = end;
      inStretch = 1;
    }
    let current = score(shared, inStretch);
    let tryShared = shared;
    let tryInStretch = inStretch;
    const previousStart = start;
    for (let tryStart = previousStart; tryStart <= end; tryStart++) {
      const tried = score(tryShared, tryInStretch);
      if (tried > current) {
        current = tried;
        inStretch = tryInStretch;
        start = tryStart;
        shared = tryShared;
      }
      const leaving = sequence[tryStart] ?? "";
      if (lastAt.get(leaving) === tryStart) {
        tryInStretch--;
        if (wanted.has(leaving)) {
          tryShared--;
        }
      }
    }
    best = Math.max(best, current);
    for (let left = previousStart; left < start; left++) {
      const leaving = sequence[left] ?? "";
      if (lastAt.get(leaving) === left) {
        lastAt.set(leaving, -1);
      }
    }
  });
  return best;
}

// The real repository's orders, with titles compared by code point as its collate "C" does.
const compare = (a: string | number, b: string | number) =>
  a < b ? -1 : a > b ? 1 : 0;
const byTitle = (a: Game, b: Game) =>
  compare(a.searchTitle, b.searchTitle) || compare(a.id, b.id);

export class MockGamesRepository implements IGamesRepository {
  // The catalog: the cast's games (makeCast, tests/_support/app.ts), and what the admin adds.
  readonly rows: Game[] = [];

  async search(
    searchTitle: string,
    shelfGameIds: readonly string[],
    limit: number,
  ): Promise<GameSearchResults> {
    if (searchTitle === "") {
      return { onShelves: [], inCatalog: [] };
    }
    const shelves = new Set(shelfGameIds);
    const matches = this.rows
      .map((game) => ({
        game,
        closeness: wordSimilarity(searchTitle, game.searchTitle),
        onShelves: shelves.has(game.id),
      }))
      .filter(({ closeness }) => closeness > SEARCH_MATCH_ABOVE)
      .sort(
        (a, b) =>
          Number(b.onShelves) - Number(a.onShelves) ||
          b.closeness - a.closeness ||
          // Popularity, highest first, and a game without one after every game with one.
          compare(
            b.game.popularity ?? Number.NEGATIVE_INFINITY,
            a.game.popularity ?? Number.NEGATIVE_INFINITY,
          ) ||
          byTitle(a.game, b.game),
      )
      .slice(0, limit);
    return {
      onShelves: matches
        .filter(({ onShelves }) => onShelves)
        .map(({ game }) => ({ ...game })),
      inCatalog: matches
        .filter(({ onShelves }) => !onShelves)
        .map(({ game }) => ({ ...game })),
    };
  }

  async getById(id: string): Promise<Game | undefined> {
    const game = this.rows.find((row) => row.id === id);
    return game && { ...game };
  }

  async listByIds(ids: readonly string[]): Promise<Game[]> {
    const wanted = new Set(ids);
    return this.rows
      .filter((game) => wanted.has(game.id))
      .sort(byTitle)
      .map((game) => ({ ...game }));
  }

  async listExpansions(baseGameId: string): Promise<Game[]> {
    return this.rows
      .filter((game) => game.baseGameId === baseGameId)
      .sort(byTitle)
      .map((game) => ({ ...game }));
  }

  // Each use of a category counts, as unnest counts them.
  async listCategories(): Promise<string[]> {
    const uses = new Map<string, number>();
    for (const game of this.rows) {
      for (const category of game.categories ?? []) {
        uses.set(category, (uses.get(category) ?? 0) + 1);
      }
    }
    return [...uses]
      .sort(([a, aUses], [b, bUses]) => bUses - aUses || compare(a, b))
      .map(([category]) => category);
  }

  async add(game: GameRecord): Promise<Game> {
    const now = new Date();
    const added: Game = {
      ...game,
      id: crypto.randomUUID(),
      searchTitle: toSearchTitle(game.title),
      popularity: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(added);
    return { ...added };
  }

  async update(id: string, game: GameRecord): Promise<Game> {
    const row = this.rows.find((one) => one.id === id);
    if (!row) {
      throw new DatabaseOperationError("update failed");
    }
    Object.assign(row, game, {
      searchTitle: toSearchTitle(game.title),
      updatedAt: new Date(),
    });
    return { ...row };
  }
}
