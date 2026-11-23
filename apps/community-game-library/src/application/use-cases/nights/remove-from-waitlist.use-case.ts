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

export type IRemoveFromWaitlistUseCase = ReturnType<
  typeof removeFromWaitlistUseCase
>;

// Take someone off the waitlist (D7, R31), after its dialog: they stay on the night's list as
// can't go, so the night is still theirs to see, and they're told (removed-from-waitlist). Only
// the host takes anyone off.
export const removeFromWaitlistUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "removeFromWaitlist",
  });
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (
    gameNightId: string,
    memberId: string,
    userId: string,
  ): Promise<void> =>
    transactionManagerService.startTransaction(async (tx) => {
      await gameNightsRepository.lock(gameNightId, tx);
      const night = await nightToChange(readers, gameNightId, userId, tx);
      if (night.createdBy !== userId) {
        throw new UnauthorizedError("Only the host takes someone off.");
      }
      const row = await gameNightsRepository.getAttendee(
        night.id,
        memberId,
        tx,
      );
      if (row?.status !== "waitlisted") {
        throw new InputParseError("They’re not on the waitlist now.");
      }
      await gameNightsRepository.updateAttendee(
        night.id,
        memberId,
        { status: "cant-go", guestCount: 0, waitlistedAt: null },
        tx,
      );
      await noticesRepository.add(
        {
          userId: memberId,
          type: "removed-from-waitlist",
          createdBy: userId,
          gameNightId: night.id,
        },
        tx,
      );
      logger.debug("Off the waitlist", { gameNightId: night.id });
    });
};
