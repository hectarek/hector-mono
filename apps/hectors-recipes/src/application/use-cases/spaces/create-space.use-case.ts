import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type {
  CreateSpaceInput,
  Space,
} from "@/src/entities/models/space.model";

export type ICreateSpaceUseCase = ReturnType<typeof createSpaceUseCase>;

export const createSpaceUseCase = (
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "createSpace" });

  return async (input: CreateSpaceInput, userId: string): Promise<Space> => {
    logger.info("Creating space", { type: input.type, userId });
    return transactionManagerService.startTransaction((tx) =>
      spacesRepository.create(input, userId, tx),
    );
  };
};
