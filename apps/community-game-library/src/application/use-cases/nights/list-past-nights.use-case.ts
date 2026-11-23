import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { GameNight } from "@/src/entities/models/game-night.model";
import {
  formerMember,
  type NameAndPiece,
} from "@/src/entities/models/user-profile.model";
import { isUpcoming, seatsTaken } from "@/src/entities/night";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IListPastNightsUseCase = ReturnType<typeof listPastNightsUseCase>;

// A night on Past game nights (D12): its host, how many came, guests included, and how many games
// were on its table ("Jo hosted · 5 came · 3 games").
export type PastNight = {
  night: GameNight;
  host: NameAndPiece;
  came: number;
  games: number;
};

// Nights are read 36 hours past today's bounds and kept by their Eastern day, as list-nights does.
const READ_AHEAD_MS = 36 * 60 * 60 * 1000;

// Past game nights (D12, R33): the nights the member can see (KTD4) whose day has gone, and the
// cancelled ones, newest first. A host whose account is gone shows as A former member (U22).
export const listPastNightsUseCase = (
  gameNightsRepository: IGameNightsRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (userId: string, now: Date): Promise<PastNight[]> => {
    const today = todayIn(PLAN_TIME_ZONE, now);
    const nights = (
      await gameNightsRepository.listVisiblePast(
        userId,
        new Date(now.getTime() + READ_AHEAD_MS),
      )
    ).filter(
      (night) =>
        night.cancelledAt !== null || !isUpcoming(night.startsAt, today),
    );
    const ids = nights.map((night) => night.id);
    const lists = await gameNightsRepository.listAttendees(ids);
    const tables = await gameNightsRepository.listGames(ids);
    const hosts = new Map(
      (
        await userProfilesRepository.getManyByUserIds([
          ...new Set(nights.map((night) => night.createdBy)),
        ])
      ).map((person) => [person.userId, person]),
    );
    return nights.map((night) => ({
      night,
      host: hosts.get(night.createdBy) ?? formerMember(night.createdBy),
      came: seatsTaken(lists.filter((one) => one.gameNightId === night.id)),
      games: tables.filter((one) => one.gameNightId === night.id).length,
    }));
  };
};
