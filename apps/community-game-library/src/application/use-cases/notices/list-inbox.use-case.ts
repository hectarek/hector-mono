import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import { shownTypes } from "@/src/application/use-cases/notices/notice-groups";
import type { GameSuggestion } from "@/src/entities/models/game-suggestion.model";
import type { InboxNotice } from "@/src/entities/models/notice.model";
import type { UserGame } from "@/src/entities/models/user-game.model";

export type IListInboxUseCase = ReturnType<typeof listInboxUseCase>;

const ids = (values: (string | null)[]) => [
  ...new Set(values.filter((value): value is string => value !== null)),
];

// The inbox (F1; R27): the member's notices, newest first, without the groups they switched off
// (E7), each with what its words need. Each read waits for the one before (KTD2).
export const listInboxUseCase = (
  noticesRepository: INoticesRepository,
  userSettingsRepository: IUserSettingsRepository,
  loansRepository: ILoansRepository,
  userGamesRepository: IUserGamesRepository,
  gamesRepository: IGamesRepository,
  gameSuggestionsRepository: IGameSuggestionsRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (userId: string): Promise<InboxNotice[]> => {
    const shown = new Set(await shownTypes(userSettingsRepository, userId));
    const notices = (await noticesRepository.listForUser(userId)).filter(
      (notice) => shown.has(notice.type),
    );
    const loans = await loansRepository.listByIds(
      ids(notices.map((notice) => notice.loanId)),
    );
    const copies: UserGame[] = [];
    for (const copyId of ids(loans.map((loan) => loan.userGameId))) {
      const copy = await userGamesRepository.getById(copyId);
      if (copy) copies.push(copy);
    }
    const games = await gamesRepository.listByIds(
      ids(copies.map((copy) => copy.gameId)),
    );
    const suggestions: GameSuggestion[] = [];
    for (const suggestionId of ids(
      notices.map((notice) => notice.gameSuggestionId),
    )) {
      const suggestion = await gameSuggestionsRepository.getById(suggestionId);
      if (suggestion) suggestions.push(suggestion);
    }
    const people = new Map(
      (
        await userProfilesRepository.getManyByUserIds(
          ids([
            ...notices.map((notice) => notice.createdBy),
            ...loans.map((loan) => loan.borrowerUserId),
          ]),
        )
      ).map((person) => [person.userId, person]),
    );

    return notices.map((notice): InboxNotice => {
      const loan = loans.find((one) => one.id === notice.loanId);
      const copy = loan && copies.find((one) => one.id === loan.userGameId);
      const game = copy && games.find((one) => one.id === copy.gameId);
      const suggestion = suggestions.find(
        (one) => one.id === notice.gameSuggestionId,
      );
      return {
        notice,
        actor: (notice.createdBy && people.get(notice.createdBy)) || null,
        loan:
          loan && copy && game
            ? {
                id: loan.id,
                gameId: game.id,
                gameTitle: game.title,
                ownerId: copy.userId,
                borrowerId: loan.borrowerUserId,
                borrowerName: people.get(loan.borrowerUserId)?.name ?? null,
                requestNote: loan.requestNote,
                dueOn: loan.dueOn,
                moreTimeDueOn: loan.moreTimeDueOn,
              }
            : null,
        night: null,
        suggestion: suggestion
          ? {
              id: suggestion.id,
              title: suggestion.title,
              status: suggestion.status,
              gameId: suggestion.gameId,
            }
          : null,
      };
    });
  };
};
