import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { newLinkToken } from "@/src/entities/link-token";
import type {
  GameNight,
  NewGameNight,
} from "@/src/entities/models/game-night.model";

export type ICreateNightUseCase = ReturnType<typeof createNightUseCase>;

// What D5 sends: the night's fields, and the games on the table, picked from the host's own
// library (D6) in the order they were picked.
export type NightToCreate = Omit<NewGameNight, "createdBy"> & {
  userGameIds: readonly string[];
};

// Create a game night (D5, R29, R30, R47): it starts from now on, the host goes on its list as
// going, so the seats count them, and the games picked from their library go on its table. A copy
// that isn't theirs is Not found, as anyone else's copy is to them. A night only invited people
// see gets its link (D7, KTD18).
export const createNightUseCase = (
  userGamesRepository: IUserGamesRepository,
  gameNightsRepository: IGameNightsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "createNight" });

  return async (
    { userGameIds, ...night }: NightToCreate,
    userId: string,
    now: Date,
  ): Promise<GameNight> => {
    if (night.startsAt <= now) {
      throw new InputParseError("Pick a time from now on.");
    }
    const picked = [...new Set(userGameIds)];
    return transactionManagerService.startTransaction(async (tx) => {
      const copies = await userGamesRepository.listByIds(picked, tx);
      if (
        copies.length !== picked.length ||
        copies.some((copy) => copy.userId !== userId)
      ) {
        throw new NotFoundError();
      }
      const created = await gameNightsRepository.create(
        {
          ...night,
          createdBy: userId,
          linkToken: night.audience === "invited" ? newLinkToken() : null,
        },
        tx,
      );
      await gameNightsRepository.addAttendee(
        { gameNightId: created.id, userId, status: "going" },
        tx,
      );
      await gameNightsRepository.addGames(created.id, picked, tx);
      logger.debug("Created", {
        gameNightId: created.id,
        games: picked.length,
      });
      return created;
    });
  };
};
