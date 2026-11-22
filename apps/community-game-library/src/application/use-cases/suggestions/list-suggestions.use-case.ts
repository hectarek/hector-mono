import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IRequireAdmin } from "@/src/application/use-cases/admin/require-admin";
import type { GameSuggestion } from "@/src/entities/models/game-suggestion.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IListSuggestionsUseCase = ReturnType<typeof listSuggestionsUseCase>;

export type ListedSuggestion = {
  suggestion: GameSuggestion;
  // Who suggested it, unless their account has gone.
  by: NameAndPiece | null;
};

// The admin's suggestions waiting (G1), oldest first. Only the admin reads them.
export const listSuggestionsUseCase = (
  requireAdmin: IRequireAdmin,
  gameSuggestionsRepository: IGameSuggestionsRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (userId: string): Promise<ListedSuggestion[]> => {
    requireAdmin(userId);
    const waiting = await gameSuggestionsRepository.listWaiting();
    const people = await userProfilesRepository.getManyByUserIds([
      ...new Set(waiting.map((suggestion) => suggestion.createdBy)),
    ]);
    return waiting.map((suggestion) => ({
      suggestion,
      by:
        people.find((person) => person.userId === suggestion.createdBy) ?? null,
    }));
  };
};
