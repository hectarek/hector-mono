import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { workingNightLink } from "@/src/application/use-cases/nights/check-night-link.use-case";

export type IOpenNightLinkUseCase = ReturnType<typeof openNightLinkUseCase>;

// Opening a night's link, signed in (R30, KTD18): someone not on the night's list goes on it as
// invited, with nobody inviting them by name, so the night is theirs to see and answer; the Nights
// tab doesn't count it (R33). It's sent from the page as it opens, never by the page's own load,
// as a friend link is. Answers the night to open.
export const openNightLinkUseCase = (
  gameNightsRepository: IGameNightsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "openNightLink",
  });

  return async (token: string, userId: string): Promise<string> => {
    const night = await workingNightLink(gameNightsRepository, token);
    await transactionManagerService.startTransaction(async (tx) => {
      await gameNightsRepository.lock(night.id, tx);
      if (
        night.createdBy !== userId &&
        !(await gameNightsRepository.getAttendee(night.id, userId, tx))
      ) {
        await gameNightsRepository.addAttendee(
          { gameNightId: night.id, userId, status: "invited" },
          tx,
        );
        logger.debug("On the list by its link", { gameNightId: night.id });
      }
    });
    return night.id;
  };
};
