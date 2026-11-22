import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IRequireAdmin } from "@/src/application/use-cases/admin/require-admin";
import type { AnsweredSuggestion } from "@/src/application/use-cases/suggestions/list-answered-suggestions.use-case";
import { NotFoundError } from "@/src/entities/errors/common";

export type IGetSuggestionUseCase = ReturnType<typeof getSuggestionUseCase>;

// One suggestion (G2), for the admin to answer. Only the admin reads it.
export const getSuggestionUseCase = (
  requireAdmin: IRequireAdmin,
  gameSuggestionsRepository: IGameSuggestionsRepository,
  userProfilesRepository: IUserProfilesRepository,
  gamesRepository: IGamesRepository,
) => {
  return async (
    suggestionId: string,
    userId: string,
  ): Promise<AnsweredSuggestion> => {
    requireAdmin(userId);
    const suggestion = await gameSuggestionsRepository.getById(suggestionId);
    if (!suggestion) {
      throw new NotFoundError();
    }
    const [by] = await userProfilesRepository.getManyByUserIds([
      suggestion.createdBy,
    ]);
    const game = suggestion.gameId
      ? await gamesRepository.getById(suggestion.gameId)
      : undefined;
    return { suggestion, by: by ?? null, game: game ?? null };
  };
};
