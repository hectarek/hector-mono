import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IRequireAdmin } from "@/src/application/use-cases/admin/require-admin";
import type { ListedSuggestion } from "@/src/application/use-cases/suggestions/list-suggestions.use-case";
import type { Game } from "@/src/entities/models/game.model";

export type IListAnsweredSuggestionsUseCase = ReturnType<
  typeof listAnsweredSuggestionsUseCase
>;

export type AnsweredSuggestion = ListedSuggestion & {
  // The game it was added as, or pointed to.
  game: Game | null;
};

// Answered suggestions (G7), the latest answer first. Only the admin reads them.
export const listAnsweredSuggestionsUseCase = (
  requireAdmin: IRequireAdmin,
  gameSuggestionsRepository: IGameSuggestionsRepository,
  userProfilesRepository: IUserProfilesRepository,
  gamesRepository: IGamesRepository,
) => {
  return async (userId: string): Promise<AnsweredSuggestion[]> => {
    requireAdmin(userId);
    const answered = await gameSuggestionsRepository.listAnswered();
    const people = await userProfilesRepository.getManyByUserIds([
      ...new Set(answered.map((suggestion) => suggestion.createdBy)),
    ]);
    const games = await gamesRepository.listByIds([
      ...new Set(answered.flatMap((suggestion) => suggestion.gameId ?? [])),
    ]);
    return answered.map((suggestion) => ({
      suggestion,
      by:
        people.find((person) => person.userId === suggestion.createdBy) ?? null,
      game: games.find((game) => game.id === suggestion.gameId) ?? null,
    }));
  };
};
