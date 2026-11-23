import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { nightToSee } from "@/src/application/use-cases/nights/can-see-night";
import {
  fillSeats,
  leaveTable,
} from "@/src/application/use-cases/nights/night-seats";
import {
  ChangedError,
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import type { GameNightAttendee } from "@/src/entities/models/game-night-attendee.model";
import { fits, waitlistOf } from "@/src/entities/night";

export type IAnswerNightUseCase = ReturnType<typeof answerNightUseCase>;

// D2's and D3's answers, and D4's Join the waitlist.
export const NIGHT_ANSWERS = [
  "going",
  "waitlisted",
  "maybe",
  "cant-go",
] as const;
export type NightAnswer = (typeof NIGHT_ANSWERS)[number];

export type AnsweredNight = {
  status: GameNightAttendee["status"];
  guestCount: number;
  // Their place on the waitlist, 1st, 2nd, while they're on it.
  place: number | null;
};

// Answer a game night (R31, R47; D2, D3, D4), under the night's lock. Going takes a seat and one
// for each guest, when the host lets people bring them; a seat taken while the sheet was open is
// Changed underneath, with Join the waitlist (KTD16). Joining the waitlist keeps a place already
// held there, and goes straight to going when the seats are there after all. Someone who stops
// going takes their games off the table with their votes, and the seats that opens go to the
// waitlist, whose people are told (AE4). The host goes to their own night.
export const answerNightUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  userGamesRepository: IUserGamesRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "answerNight" });
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (
    gameNightId: string,
    { answer, guests }: { answer: NightAnswer; guests: number },
    userId: string,
  ): Promise<AnsweredNight> =>
    transactionManagerService.startTransaction(async (tx) => {
      await gameNightsRepository.lock(gameNightId, tx);
      const night = await nightToSee(readers, gameNightId, userId, tx);
      if (night.createdBy === userId) {
        throw new UnauthorizedError("The host goes to their own night.");
      }
      const waiting = answer === "going" || answer === "waitlisted";
      if (guests > 0 && !(waiting && night.guestsAllowed)) {
        throw new InputParseError("This night doesn’t take guests.");
      }
      const list = await gameNightsRepository.listAttendees([night.id], tx);
      const mine = list.find((one) => one.userId === userId);
      const room = fits(night.capacity, list, userId, guests);
      if (answer === "going" && !room) {
        throw new ChangedError("seats-taken");
      }
      const status: GameNightAttendee["status"] =
        waiting && room ? "going" : answer;
      const guestCount = waiting ? guests : 0;
      const waitlistedAt =
        status !== "waitlisted"
          ? null
          : mine?.status === "waitlisted"
            ? mine.waitlistedAt
            : new Date();
      if (mine) {
        await gameNightsRepository.updateAttendee(
          night.id,
          userId,
          { status, guestCount, waitlistedAt },
          tx,
        );
      } else {
        await gameNightsRepository.addAttendee(
          {
            gameNightId: night.id,
            userId,
            status,
            guestCount,
            waitlistedAt,
          },
          tx,
        );
      }
      if (mine?.status === "going" && status !== "going") {
        await leaveTable(
          gameNightsRepository,
          userGamesRepository,
          night.id,
          userId,
          tx,
        );
      }
      const movedUp = await fillSeats(
        gameNightsRepository,
        noticesRepository,
        night,
        tx,
      );
      const after = await gameNightsRepository.listAttendees([night.id], tx);
      const place =
        waitlistOf(after).findIndex((one) => one.userId === userId) + 1;
      logger.debug("Answered", {
        gameNightId: night.id,
        status,
        movedUp: movedUp.length,
      });
      return {
        status: place > 0 ? "waitlisted" : status,
        guestCount,
        place: place > 0 ? place : null,
      };
    });
};
