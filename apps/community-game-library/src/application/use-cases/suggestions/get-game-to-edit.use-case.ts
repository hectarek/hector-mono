import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IRequireAdmin } from "@/src/application/use-cases/admin/require-admin";
import { NotFoundError } from "@/src/entities/errors/common";
import type { Game } from "@/src/entities/models/game.model";

export type IGetGameToEditUseCase = ReturnType<typeof getGameToEditUseCase>;

// G4's record of a game, with its base game when it's an expansion. Only the admin reads it.
export const getGameToEditUseCase = (
  requireAdmin: IRequireAdmin,
  gamesRepository: IGamesRepository,
) => {
  return async (
    gameId: string,
    userId: string,
  ): Promise<{ game: Game; baseGame: Game | null }> => {
    requireAdmin(userId);
    const game = await gamesRepository.getById(gameId);
    if (!game) {
      throw new NotFoundError();
    }
    const baseGame = game.baseGameId
      ? await gamesRepository.getById(game.baseGameId)
      : undefined;
    return { game, baseGame: baseGame ?? null };
  };
};
