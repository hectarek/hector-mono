import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IRequireAdmin } from "@/src/application/use-cases/admin/require-admin";
import type { Game } from "@/src/entities/models/game.model";
import { toSearchTitle } from "@/src/entities/search-title";

export type IFindGamesToEditUseCase = ReturnType<typeof findGamesToEditUseCase>;

// As many as G5 lists.
const FIND_LIMIT = 30;

// G5, Find a game to edit: the catalog by title, base games and expansions, closest first.
export const findGamesToEditUseCase = (
  requireAdmin: IRequireAdmin,
  gamesRepository: IGamesRepository,
) => {
  return async (typed: string, userId: string): Promise<Game[]> => {
    requireAdmin(userId);
    const searchTitle = toSearchTitle(typed);
    if (searchTitle === "") {
      return [];
    }
    const found = await gamesRepository.search(searchTitle, [], FIND_LIMIT);
    return found.inCatalog;
  };
};
