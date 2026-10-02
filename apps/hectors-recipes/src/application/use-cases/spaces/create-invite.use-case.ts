import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireOwner } from "@/src/application/use-cases/spaces/require-owner";
import type {
  InviteRole,
  SpaceInvite,
} from "@/src/entities/models/space.model";

export type ICreateInviteUseCase = ReturnType<typeof createInviteUseCase>;

export const createInviteUseCase = (
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "createInvite" });

  return async (
    spaceId: string,
    role: InviteRole,
    userId: string,
  ): Promise<SpaceInvite> => {
    const invite = await transactionManagerService.startTransaction(
      async (tx) => {
        await requireOwner(spacesRepository, spaceId, userId, tx);
        return spacesRepository.createInvite(spaceId, role, userId, tx);
      },
    );
    logger.info("Invite created", { spaceId, role });
    return invite;
  };
};
