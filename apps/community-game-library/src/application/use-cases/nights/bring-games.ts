import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import { nightToChange } from "@/src/application/use-cases/nights/can-see-night";
import { UnauthorizedError } from "@/src/entities/errors/common";
import type { GameNight } from "@/src/entities/models/game-night.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// A night whose table the member may bring games to and vote on (R32, R38; D2's "Answer to say
// what you'd play"): its host, and anyone going.
export async function nightToBringTo(
  readers: {
    friendships: IFriendshipsRepository;
    gameNights: IGameNightsRepository;
  },
  gameNightId: string,
  userId: string,
  tx: ITransaction,
): Promise<GameNight> {
  await readers.gameNights.lock(gameNightId, tx);
  const night = await nightToChange(readers, gameNightId, userId, tx);
  const mine = await readers.gameNights.getAttendee(night.id, userId, tx);
  if (night.createdBy !== userId && mine?.status !== "going") {
    throw new UnauthorizedError("Only people going bring games and vote.");
  }
  return night;
}
