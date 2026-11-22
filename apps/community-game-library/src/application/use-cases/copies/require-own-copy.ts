import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { UserGame } from "@/src/entities/models/user-game.model";

// A copy only its owner may open the page of, or change (R8): a plain function a use case calls,
// as requireFriend is. A copy that isn't there is Not found; someone else's is refused.
export async function requireOwnCopy(
  userGamesRepository: IUserGamesRepository,
  userGameId: string,
  userId: string,
  tx?: ITransaction,
): Promise<UserGame> {
  const copy = await userGamesRepository.getById(userGameId, tx);
  if (!copy) {
    throw new NotFoundError();
  }
  if (copy.userId !== userId) {
    throw new UnauthorizedError("Only its owner can change a copy.");
  }
  return copy;
}
