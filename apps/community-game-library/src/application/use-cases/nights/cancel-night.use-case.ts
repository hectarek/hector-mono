import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { nightToChange } from "@/src/application/use-cases/nights/can-see-night";
import {
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import type { GameNight } from "@/src/entities/models/game-night.model";
import type { GameNightAttendee } from "@/src/entities/models/game-night-attendee.model";
import { isUpcoming } from "@/src/entities/night";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type ICancelNightUseCase = ReturnType<typeof cancelNightUseCase>;

// Who a cancelled night tells (data-model.md, night-cancelled; D11): everyone going, invited or
// waiting. Someone who said maybe or can't go isn't.
const TOLD: ReadonlySet<GameNightAttendee["status"]> = new Set([
  "going",
  "invited",
  "waitlisted",
]);

// Cancel a night (D11, R34), after its dialog: only its host, and only while it's coming up. It
// sets cancelled_at, so the night leaves Nights for everyone and shows under past nights as
// Cancelled, and everyone going, invited or waiting is told (night-cancelled), with the host's
// note. The night keeps its list and its table.
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
      const cancelled = await gameNightsRepository.update(
        night.id,
        { cancelledAt: now },
        tx,
      );
      const list = await gameNightsRepository.listAttendees([night.id], tx);
      for (const one of list) {
        if (one.userId !== userId && TOLD.has(one.status)) {
          await noticesRepository.add(
            {
              userId: one.userId,
              type: "night-cancelled",
              createdBy: userId,
              gameNightId: night.id,
              answerNote: note,
            },
            tx,
          );
        }
      }
      logger.debug("Night cancelled", { gameNightId: night.id });
      return cancelled;
    });
};
