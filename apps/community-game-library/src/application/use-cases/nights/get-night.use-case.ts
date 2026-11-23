import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { nightToSee } from "@/src/application/use-cases/nights/can-see-night";
import {
  type NightCard,
  nightCards,
} from "@/src/application/use-cases/nights/night-cards";
import { NotFoundError } from "@/src/entities/errors/common";
import type { Game } from "@/src/entities/models/game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IGetNightUseCase = ReturnType<typeof getNightUseCase>;

// A game on the night's table, and who brings it (D2, D7: "Sam brings it").
export type GameOnTable = {
  userGameId: string;
  game: Game;
  owner: NameAndPiece;
};

// A night's page (D2, D7, D13): its card, with who said maybe, and the games on its table in the
// order they were put there. U19 adds the waitlist and the votes.
export type NightPage = NightCard & {
  maybe: NameAndPiece[];
  games: GameOnTable[];
};

// One night, for someone who may see it (KTD4), with its place and address (R36); anyone else
// gets Not found (AE5). People at one night see each other's names and pieces, and the games they
// bring, never each other's libraries (R30).
export const getNightUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  userGamesRepository: IUserGamesRepository,
  gamesRepository: IGamesRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (gameNightId: string, userId: string): Promise<NightPage> => {
    const night = await nightToSee(readers, gameNightId, userId);
    const [card] = await nightCards(
      gameNightsRepository,
      userProfilesRepository,
      [night],
      userId,
    );
    if (!card) {
      throw new NotFoundError();
    }
    const list = await gameNightsRepository.listAttendees([night.id]);
    const onTable = await gameNightsRepository.listGames([night.id]);
    const copies = new Map(
      (
        await userGamesRepository.listByIds(
          onTable.map((one) => one.userGameId),
        )
      ).map((copy) => [copy.id, copy]),
    );
    const games = new Map(
      (
        await gamesRepository.listByIds([
          ...new Set([...copies.values()].map((copy) => copy.gameId)),
        ])
      ).map((game) => [game.id, game]),
    );
    const people = new Map(
      (
        await userProfilesRepository.getManyByUserIds([
          ...new Set([
            ...[...copies.values()].map((copy) => copy.userId),
            ...list
              .filter((one) => one.status === "maybe")
              .map((one) => one.userId),
          ]),
        ])
      ).map((person) => [person.userId, person]),
    );
    return {
      ...card,
      maybe: list
        .filter((one) => one.status === "maybe")
        .flatMap((one) => people.get(one.userId) ?? []),
      games: onTable.flatMap((one) => {
        const copy = copies.get(one.userGameId);
        const game = copy && games.get(copy.gameId);
        const owner = copy && people.get(copy.userId);
        return copy && game && owner
          ? [{ userGameId: copy.id, game, owner }]
          : [];
      }),
    };
  };
};
