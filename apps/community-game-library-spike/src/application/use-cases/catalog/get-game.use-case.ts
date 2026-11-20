import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { Game } from "@/src/entities/game";

export type IGetGameUseCase = ReturnType<typeof getGameUseCase>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getGameUseCase =
  (gamesRepository: IGamesRepository) =>
  async (id: string): Promise<Game | undefined> => {
    if (!UUID.test(id)) return undefined;
    return gamesRepository.getById(id);
  };
