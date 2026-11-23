import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { Game } from "@/src/entities/models/game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import type { PlayGame } from "@/src/entities/what-to-play";

// A game the night's tools choose from (D8, D9): the game, whether it's on the night's table and
// its votes there, and whose copies they are ("Sam brings it", or whose shelf it's on).
export type PlayChoice = Game & PlayGame & { owners: NameAndPiece[] };

export type PlayChoices = {
  onTable: PlayChoice[];
  // All the member's friends' games and their own, the ones on the table among them.
  allGames: PlayChoice[];
};

// The games on a night's table, and every game on the shelves the member can see (theirs and
// their friends', KTD4), one each, a game on the table taking its place there.
export async function playChoices(
  repositories: {
    gameNights: IGameNightsRepository;
    userGames: IUserGamesRepository;
    games: IGamesRepository;
    userProfiles: IUserProfilesRepository;
  },
  gameNightId: string,
  userId: string,
): Promise<PlayChoices> {
  const onTable = await repositories.gameNights.listGames([gameNightId]);
  const votes = await repositories.gameNights.listVotes([gameNightId]);
  // In the order they went on the table.
  const byId = new Map(
    (
      await repositories.userGames.listByIds(
        onTable.map((one) => one.userGameId),
      )
    ).map((copy) => [copy.id, copy]),
  );
  const tableCopies = onTable.flatMap((one) => byId.get(one.userGameId) ?? []);
  const shelves = await repositories.userGames.listVisible(userId);
  const copies = [...tableCopies, ...shelves];
  const games = new Map(
    (
      await repositories.games.listByIds([
        ...new Set(copies.map((copy) => copy.gameId)),
      ])
    ).map((game) => [game.id, game]),
  );
  const people = new Map(
    (
      await repositories.userProfiles.getManyByUserIds([
        ...new Set(copies.map((copy) => copy.userId)),
      ])
    ).map((person) => [person.userId, person]),
  );

  const choices = (
    list: typeof copies,
    tabled: boolean,
  ): Map<string, PlayChoice> => {
    const found = new Map<string, PlayChoice>();
    for (const copy of list) {
      const game = games.get(copy.gameId);
      const owner = people.get(copy.userId);
      if (!game || !owner) {
        continue;
      }
      const seen = found.get(game.id);
      if (seen) {
        if (!seen.owners.some((one) => one.userId === owner.userId)) {
          seen.owners.push(owner);
        }
        seen.votes += tabled
          ? votes.filter((vote) => vote.userGameId === copy.id).length
          : 0;
        continue;
      }
      found.set(game.id, {
        ...game,
        onTable: tabled,
        votes: tabled
          ? votes.filter((vote) => vote.userGameId === copy.id).length
          : 0,
        owners: [owner],
      });
    }
    return found;
  };

  const table = choices(tableCopies, true);
  const all = new Map(table);
  for (const [gameId, choice] of choices(shelves, false)) {
    if (!all.has(gameId)) {
      all.set(gameId, choice);
    }
  }
  return { onTable: [...table.values()], allGames: [...all.values()] };
}
