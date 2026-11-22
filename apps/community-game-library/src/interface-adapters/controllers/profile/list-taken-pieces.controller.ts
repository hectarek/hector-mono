import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListTakenPiecesUseCase } from "@/src/application/use-cases/profile/list-taken-pieces.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IListTakenPiecesController = ReturnType<
  typeof listTakenPiecesController
>;

export const listTakenPiecesController = (
  useCase: IListTakenPiecesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listTakenPieces",
  });

  return async (userId: string | undefined): Promise<NameAndPiece[]> => {
    logger.debug("Checking the user", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
