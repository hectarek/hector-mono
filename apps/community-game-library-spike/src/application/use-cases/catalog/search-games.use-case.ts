import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import { type Game, searchInputSchema } from "@/src/entities/game";
import { toSearchTitle } from "@/src/entities/search-title";

export type ISearchGamesUseCase = ReturnType<typeof searchGamesUseCase>;

const RESULT_LIMIT = 20;

export const searchGamesUseCase =
  (gamesRepository: IGamesRepository) =>
  async (input: { query: string }): Promise<Game[]> => {
    const { query } = searchInputSchema.parse(input);
    const needle = toSearchTitle(query);
    if (!needle) return [];
    return gamesRepository.search(needle, RESULT_LIMIT);
  };
