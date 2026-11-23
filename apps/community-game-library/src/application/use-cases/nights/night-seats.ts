import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { GameNight } from "@/src/entities/models/game-night.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { movingUp } from "@/src/entities/night";

// What the moves that change a night's seats share (U19), inside the move's own transaction,
// after the night's lock.

// Seats that opened go to the waitlist: each waitlisted member who fits moves to going, in the
// waitlist's order, and is told (waitlist-seat; R31, AE4). Answers who moved up.
export async function fillSeats(
  gameNightsRepository: IGameNightsRepository,
  noticesRepository: INoticesRepository,
  night: GameNight,
  tx: ITransaction,
): Promise<string[]> {
  const list = await gameNightsRepository.listAttendees([night.id], tx);
  const moving = movingUp(night.capacity, list);
  for (const one of moving) {
    await gameNightsRepository.updateAttendee(
      night.id,
      one.userId,
      { status: "going", waitlistedAt: null },
      tx,
    );
    await noticesRepository.add(
      { userId: one.userId, type: "waitlist-seat", gameNightId: night.id },
      tx,
    );
  }
  return moving.map((one) => one.userId);
}

// A member who stops going takes their games off the table, with everyone's votes on them, and
// their own votes go too (docs/data-model.md, game_night_games and game_night_votes).
export async function leaveTable(
  gameNightsRepository: IGameNightsRepository,
  userGamesRepository: IUserGamesRepository,
  gameNightId: string,
  userId: string,
  tx: ITransaction,
): Promise<void> {
  const onTable = await gameNightsRepository.listGames([gameNightId], tx);
  const theirs = (
    await userGamesRepository.listByIds(
      onTable.map((one) => one.userGameId),
      tx,
    )
  ).filter((copy) => copy.userId === userId);
  await gameNightsRepository.removeGames(
    gameNightId,
    theirs.map((copy) => copy.id),
    tx,
  );
  await gameNightsRepository.removeVotesBy(gameNightId, userId, tx);
}
