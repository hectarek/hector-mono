import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { nightToChange } from "@/src/application/use-cases/nights/can-see-night";
import { cancelAndTell } from "@/src/application/use-cases/nights/cancel-and-tell";
import {
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import type { GameNight } from "@/src/entities/models/game-night.model";
import { isUpcoming } from "@/src/entities/night";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type ICancelNightUseCase = ReturnType<typeof cancelNightUseCase>;

// Cancel a night (D11, R34), after its dialog: only its host, and only while it's coming up.
// cancelAndTell sets cancelled_at and tells everyone going, invited or waiting, with the host's
// note.
export const cancelNightUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "cancelNight" });
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (
    gameNightId: string,
    note: string | null,
    userId: string,
    now: Date,
  ): Promise<GameNight> =>
    transactionManagerService.startTransaction(async (tx) => {
      await gameNightsRepository.lock(gameNightId, tx);
      const night = await nightToChange(readers, gameNightId, userId, tx);
      if (night.createdBy !== userId) {
        throw new UnauthorizedError("Only the host cancels a night.");
      }
      if (!isUpcoming(night.startsAt, todayIn(PLAN_TIME_ZONE, now))) {
        throw new InputParseError("This night is over.");
      }
      const cancelled = await cancelAndTell(
        gameNightsRepository,
        noticesRepository,
        night,
        note,
        now,
        tx,
      );
      logger.debug("Night cancelled", { gameNightId: night.id });
      return cancelled;
    });
};
