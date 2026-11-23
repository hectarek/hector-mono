import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { nightToSee } from "@/src/application/use-cases/nights/can-see-night";
import { nightCards } from "@/src/application/use-cases/nights/night-cards";
import {
  type PlayChoices,
  playChoices,
} from "@/src/application/use-cases/nights/play-choices";
import { NotFoundError } from "@/src/entities/errors/common";
import type { GameNight } from "@/src/entities/models/game-night.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import type { TableParty } from "@/src/entities/tables";
import { type PlayTime, startingTime } from "@/src/entities/what-to-play";

export type ISplitTablesUseCase = ReturnType<typeof splitTablesUseCase>;

export type TablesChoices = PlayChoices & {
  night: Pick<GameNight, "id" | "title">;
  // Everyone going with their guests: the host first, the rest in the order they answered.
  parties: TableParty<NameAndPiece>[];
  minutes: PlayTime;
};

// Split into tables (D9, R46), for anyone who can see the night (KTD4): the people going and the
// games to split them among. The split itself is tables.ts's, which the page works out, and
// sharing it stores nothing (KTD23).
export const splitTablesUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  userGamesRepository: IUserGamesRepository,
  gamesRepository: IGamesRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (
    gameNightId: string,
    userId: string,
  ): Promise<TablesChoices> => {
    const night = await nightToSee(
      { friendships: friendshipsRepository, gameNights: gameNightsRepository },
      gameNightId,
      userId,
    );
    const [card] = await nightCards(
      gameNightsRepository,
      userProfilesRepository,
      [night],
      userId,
    );
    if (!card) {
      throw new NotFoundError();
    }
    const choices = await playChoices(
      {
        gameNights: gameNightsRepository,
        userGames: userGamesRepository,
        games: gamesRepository,
        userProfiles: userProfilesRepository,
      },
      night.id,
      userId,
    );
    return {
      ...choices,
      night: { id: night.id, title: night.title },
      parties: card.going.map(({ guestCount, ...member }) => ({
        member,
        guests: guestCount,
      })),
      minutes: startingTime(night.startsAt, night.endsAt),
    };
  };
};
