import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type {
  GameSuggestion,
  SuggestionAnswer,
} from "@/src/entities/models/game-suggestion.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

export type AnswerRepositories = {
  gameSuggestions: IGameSuggestionsRepository;
  games: IGamesRepository;
  userGames: IUserGamesRepository;
  userSettings: IUserSettingsRepository;
  notices: INoticesRepository;
};

// The admin's answer to a waiting suggestion (G2; R4), inside the caller's transaction: added or
// already here puts the game on the suggester's shelf, with their default pass-along, as I own
// it would (an expansion, never a copy of its own, R3, isn't put there); a decline keeps its
// reason. Either way the suggester is told (suggestion-answered), the reason on the notice.
// A plain function the answering use cases call, as requireFriend is.
export async function answerSuggestion(
  repositories: AnswerRepositories,
  suggestionId: string,
  answer: SuggestionAnswer,
  adminId: string,
  tx: ITransaction,
): Promise<GameSuggestion> {
  const suggestion = await repositories.gameSuggestions.getById(
    suggestionId,
    tx,
  );
  if (!suggestion) {
    throw new NotFoundError();
  }
  if (suggestion.status !== "waiting") {
    throw new InputParseError("This suggestion has an answer already");
  }
  if (answer.status !== "declined") {
    const game = await repositories.games.getById(answer.gameId, tx);
    if (!game) {
      throw new NotFoundError();
    }
    if (game.type === "base-game") {
      const settings = await repositories.userSettings.getByUserId(
        suggestion.createdBy,
        tx,
      );
      await repositories.userGames.add(
        {
          userId: suggestion.createdBy,
          gameId: game.id,
          passAlong: settings?.defaultPassAlong ?? false,
        },
        tx,
      );
    }
  }
  const answered = await repositories.gameSuggestions.answer(
    suggestion.id,
    answer,
    tx,
  );
  await repositories.notices.add(
    {
      userId: suggestion.createdBy,
      type: "suggestion-answered",
      createdBy: adminId,
      gameSuggestionId: suggestion.id,
      answerNote: answer.status === "declined" ? answer.declineNote : null,
    },
    tx,
  );
  return answered;
}
