import type { Game, GameRecord } from "@/src/entities/models/game.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Search's two groups (R2): the games on the member's and their friends' shelves, then the rest
// of the catalog.
export type GameSearchResults = { onShelves: Game[]; inCatalog: Game[] };

// The catalog (docs/data-model.md, games): base games and expansions, which every member may
// read, and the admin writes (U9).
export interface IGamesRepository {
  // The games whose search title matches `searchTitle` (already through toSearchTitle) by word
  // similarity above SEARCH_MATCH_ABOVE (KTD10). Those in `shelfGameIds` come first, then the
  // rest, each by closeness, then popularity, then title. At most `limit` in all.
  search(
    searchTitle: string,
    shelfGameIds: readonly string[],
    limit: number,
    tx?: ITransaction,
  ): Promise<GameSearchResults>;
  getById(id: string, tx?: ITransaction): Promise<Game | undefined>;
  // These games, by title.
  listByIds(ids: readonly string[], tx?: ITransaction): Promise<Game[]>;
  // A base game's expansions, by title.
  listExpansions(baseGameId: string, tx?: ITransaction): Promise<Game[]>;
  // Every category the catalog's games use, the most used first, then by name (G3's chips).
  listCategories(tx?: ITransaction): Promise<string[]>;

  // The admin's writes (G3, G4), each writing the search title with the title (KTD10).
  add(game: GameRecord, tx: ITransaction): Promise<Game>;
  update(id: string, game: GameRecord, tx: ITransaction): Promise<Game>;
}
