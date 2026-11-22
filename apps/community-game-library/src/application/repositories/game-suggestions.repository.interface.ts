import type {
  GameSuggestion,
  NewGameSuggestion,
  SuggestionAnswer,
} from "@/src/entities/models/game-suggestion.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Members' suggestions of games search didn't find (docs/data-model.md, game_suggestions; R4).
export interface IGameSuggestionsRepository {
  add(suggestion: NewGameSuggestion, tx: ITransaction): Promise<GameSuggestion>;
  getById(id: string, tx?: ITransaction): Promise<GameSuggestion | undefined>;
  // Those waiting on the admin, oldest first (G1).
  listWaiting(tx?: ITransaction): Promise<GameSuggestion[]>;
  // Those answered, the latest answer first (G7).
  listAnswered(tx?: ITransaction): Promise<GameSuggestion[]>;
  // A member's own, still waiting, oldest first (My library).
  listWaitingBy(userId: string, tx?: ITransaction): Promise<GameSuggestion[]>;
  // Answers one, stamping when (answered_at).
  answer(
    id: string,
    answer: SuggestionAnswer,
    tx: ITransaction,
  ): Promise<GameSuggestion>;
}
