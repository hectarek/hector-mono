import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { nightToSee } from "@/src/application/use-cases/nights/can-see-night";
import {
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import type {
  GameNight,
  GameNightChanges,
} from "@/src/entities/models/game-night.model";
import { seatsTaken } from "@/src/entities/night";

export type IUpdateNightUseCase = ReturnType<typeof updateNightUseCase>;

// What the night's card and page say about when, where and what: a change to any of these tells
// everyone going. The seats, who sees it and the two switches change quietly.
const TOLD_OF = [
  "title",
  "startsAt",
  "endsAt",
  "place",
  "address",
  "hostNote",
] as const satisfies readonly (keyof GameNightChanges)[];

const same = (a: Date | string | null, b: Date | string | null) =>
  a instanceof Date && b instanceof Date
    ? a.getTime() === b.getTime()
    : a === b;

// The host's Edit (from D7, R34): the night's fields change under its row lock, and everyone going
// but the host gets night-changed when its time, place or words moved. The seats can't drop
// below the ones taken, and a new start is from now on. Someone else who can see the night is
// refused; anyone else gets Not found (KTD4).
export const updateNightUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "updateNight" });
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (
    gameNightId: string,
    changes: GameNightChanges,
    userId: string,
    now: Date,
  ): Promise<{ night: GameNight; told: string[] }> =>
    transactionManagerService.startTransaction(async (tx) => {
      await gameNightsRepository.lock(gameNightId, tx);
      const night = await nightToSee(readers, gameNightId, userId, tx);
      if (night.createdBy !== userId) {
        throw new UnauthorizedError("Only the host changes a night.");
      }
      if (
        changes.startsAt &&
        !same(changes.startsAt, night.startsAt) &&
        changes.startsAt <= now
      ) {
        throw new InputParseError("Pick a time from now on.");
      }
      const list = await gameNightsRepository.listAttendees([gameNightId], tx);
      const taken = seatsTaken(list);
      if (changes.capacity !== undefined && changes.capacity < taken) {
        throw new InputParseError(
          `${taken} seats are taken, so the night needs at least ${taken}.`,
        );
      }
      const updated = await gameNightsRepository.update(
        gameNightId,
        changes,
        tx,
      );
      const told = TOLD_OF.some((key) => !same(night[key], updated[key]))
        ? list
            .filter((one) => one.status === "going" && one.userId !== userId)
            .map((one) => one.userId)
        : [];
      for (const one of told) {
        await noticesRepository.add(
          {
            userId: one,
            type: "night-changed",
            createdBy: userId,
            gameNightId,
          },
          tx,
        );
      }
      logger.debug("Updated", { gameNightId, told: told.length });
      return { night: updated, told };
    });
};
