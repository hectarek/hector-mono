import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { gameNightAttendees, gameNights } from "@/db/schema";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class GameNightsRepository
  extends BaseRepository
  implements IGameNightsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "game-nights");
  }

  async listGoingToNightsStarting(
    from: Date,
    to: Date,
    tx?: ITransaction,
  ): Promise<{ gameNightId: string; userId: string; startsAt: Date }[]> {
    try {
      return await this.getDbContext(tx)
        .select({
          gameNightId: gameNights.id,
          userId: gameNightAttendees.userId,
          startsAt: gameNights.startsAt,
        })
        .from(gameNights)
        .innerJoin(
          gameNightAttendees,
          eq(gameNightAttendees.gameNightId, gameNights.id),
        )
        .where(
          and(
            gte(gameNights.startsAt, from),
            lt(gameNights.startsAt, to),
            isNull(gameNights.cancelledAt),
            eq(gameNightAttendees.status, "going"),
          ),
        );
    } catch (err) {
      this.handleError(err, "listGoingToNightsStarting");
    }
  }
}
