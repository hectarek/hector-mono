import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  GameSuggestion,
  NewGameSuggestion,
  SuggestionAnswer,
} from "@/src/entities/models/game-suggestion.model";

// The real repository's orders: a timestamp, then the id.
const compare = (a: string | number, b: string | number) =>
  a < b ? -1 : a > b ? 1 : 0;
const oldestFirst = (a: GameSuggestion, b: GameSuggestion) =>
  compare(a.createdAt.getTime(), b.createdAt.getTime()) || compare(a.id, b.id);
const latestAnswerFirst = (a: GameSuggestion, b: GameSuggestion) =>
  compare(b.answeredAt?.getTime() ?? 0, a.answeredAt?.getTime() ?? 0) ||
  compare(b.id, a.id);

export class MockGameSuggestionsRepository
  implements IGameSuggestionsRepository
{
  readonly rows: GameSuggestion[] = [];

  async add(suggestion: NewGameSuggestion): Promise<GameSuggestion> {
    const now = new Date();
    const added: GameSuggestion = {
      ...suggestion,
      id: crypto.randomUUID(),
      status: "waiting",
      declineNote: null,
      gameId: null,
      answeredAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(added);
    return { ...added };
  }

  async getById(id: string): Promise<GameSuggestion | undefined> {
    const found = this.rows.find((row) => row.id === id);
    return found && { ...found };
  }

  async listWaiting(): Promise<GameSuggestion[]> {
    return this.rows
      .filter((row) => row.status === "waiting")
      .sort(oldestFirst)
      .map((row) => ({ ...row }));
  }

  async listAnswered(): Promise<GameSuggestion[]> {
    return this.rows
      .filter((row) => row.status !== "waiting")
      .sort(latestAnswerFirst)
      .map((row) => ({ ...row }));
  }

  async listWaitingBy(userId: string): Promise<GameSuggestion[]> {
    return this.rows
      .filter((row) => row.createdBy === userId && row.status === "waiting")
      .sort(oldestFirst)
      .map((row) => ({ ...row }));
  }

  async answer(id: string, answer: SuggestionAnswer): Promise<GameSuggestion> {
    const row = this.rows.find((one) => one.id === id);
    if (!row) {
      throw new DatabaseOperationError("answer failed");
    }
    Object.assign(row, {
      status: answer.status,
      gameId: answer.status === "declined" ? null : answer.gameId,
      declineNote: answer.status === "declined" ? answer.declineNote : null,
      answeredAt: new Date(),
      updatedAt: new Date(),
    });
    return { ...row };
  }
}
