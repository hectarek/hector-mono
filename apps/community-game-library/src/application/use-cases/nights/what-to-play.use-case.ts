import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { nightToSee } from "@/src/application/use-cases/nights/can-see-night";
import {
  type PlayChoices,
  playChoices,
} from "@/src/application/use-cases/nights/play-choices";
import type { GameNight } from "@/src/entities/models/game-night.model";
import { seatsTaken } from "@/src/entities/night";
import { type PlayTime, startingTime } from "@/src/entities/what-to-play";

export type IWhatToPlayUseCase = ReturnType<typeof whatToPlayUseCase>;

export type WhatToPlayChoices = PlayChoices & {
  night: Pick<GameNight, "id" | "title">;
  // KTD23's starting values: the people going, guests included, and the time the night gives.
  people: number;
  minutes: PlayTime;
};

// What should we play? (D8, R37), for anyone who can see the night (KTD4): the games to choose
// from and where the choices start. The rules themselves are what-to-play.ts's, which the page
// applies as the choices change.
export const whatToPlayUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  userGamesRepository: IUserGamesRepository,
  gamesRepository: IGamesRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (
    gameNightId: string,
    userId: string,
  ): Promise<WhatToPlayChoices> => {
    const night = await nightToSee(
      { friendships: friendshipsRepository, gameNights: gameNightsRepository },
      gameNightId,
      userId,
    );
    const list = await gameNightsRepository.listAttendees([night.id]);
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
      people: seatsTaken(list),
      minutes: startingTime(night.startsAt, night.endsAt),
    };
  };
};
