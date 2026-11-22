import { and, asc, desc, eq, sql } from "drizzle-orm";
import { gameSuggestions } from "@/db/schema";
import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  GameSuggestion,
  NewGameSuggestion,
  SuggestionAnswer,
} from "@/src/entities/models/game-suggestion.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class GameSuggestionsRepository
  extends BaseRepository
  implements IGameSuggestionsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "game_suggestions");
  }

  async add(
    suggestion: NewGameSuggestion,
    tx: ITransaction,
  ): Promise<GameSuggestion> {
    try {
      const [added] = await this.getDbContext(tx)
        .insert(gameSuggestions)
        .values(suggestion)
        .returning();
      if (!added) {
        throw new DatabaseOperationError("add failed");
      }
      return added;
    } catch (err) {
      this.handleError(err, "add");
    }
  }

  async getById(
    id: string,
    tx?: ITransaction,
  ): Promise<GameSuggestion | undefined> {
    try {
      const [found] = await this.getDbContext(tx)
        .select()
        .from(gameSuggestions)
        .where(eq(gameSuggestions.id, id));
      return found;
    } catch (err) {
      this.handleError(err, "getById", { id });
    }
  }

  async listWaiting(tx?: ITransaction): Promise<GameSuggestion[]> {
    try {
      return await this.getDbContext(tx)
        .select()
        .from(gameSuggestions)
        .where(eq(gameSuggestions.status, "waiting"))
        .orderBy(asc(gameSuggestions.createdAt), asc(gameSuggestions.id));
    } catch (err) {
      this.handleError(err, "listWaiting");
    }
  }

  async listAnswered(tx?: ITransaction): Promise<GameSuggestion[]> {
    try {
      return await this.getDbContext(tx)
        .select()
        .from(gameSuggestions)
        .where(sql`${gameSuggestions.status} <> 'waiting'`)
        .orderBy(desc(gameSuggestions.answeredAt), desc(gameSuggestions.id));
    } catch (err) {
      this.handleError(err, "listAnswered");
    }
  }

  async listWaitingBy(
    userId: string,
    tx?: ITransaction,
  ): Promise<GameSuggestion[]> {
    try {
      return await this.getDbContext(tx)
        .select()
        .from(gameSuggestions)
        .where(
          and(
            eq(gameSuggestions.createdBy, userId),
            eq(gameSuggestions.status, "waiting"),
          ),
        )
        .orderBy(asc(gameSuggestions.createdAt), asc(gameSuggestions.id));
    } catch (err) {
      this.handleError(err, "listWaitingBy");
    }
  }

  async answer(
    id: string,
    answer: SuggestionAnswer,
    tx: ITransaction,
  ): Promise<GameSuggestion> {
    try {
      const [answered] = await this.getDbContext(tx)
        .update(gameSuggestions)
        .set({
          status: answer.status,
          gameId: answer.status === "declined" ? null : answer.gameId,
          declineNote: answer.status === "declined" ? answer.declineNote : null,
          answeredAt: sql`now()`,
        })
        .where(eq(gameSuggestions.id, id))
        .returning();
      if (!answered) {
        throw new DatabaseOperationError("answer failed");
      }
      return answered;
    } catch (err) {
      this.handleError(err, "answer", { id });
    }
  }
}
