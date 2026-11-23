import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import {
  type NightCard,
  nightCards,
} from "@/src/application/use-cases/nights/night-cards";
import { isUpcoming } from "@/src/entities/night";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IListNightsUseCase = ReturnType<typeof listNightsUseCase>;

// Nights are read 36 hours either side of today's bounds and kept by their Eastern day, so no
// read works out a day's bounds in UTC (U17's daily run does the same).
const READ_BACK_MS = 36 * 60 * 60 * 1000;

// Nights (D1, R33): the upcoming nights the member can see (KTD4), soonest first, each with the
// people going, the seats open and the member's own stamp. A friend's page (E3) passes
// `goingUserId` for the nights that friend is going to.
export const listNightsUseCase = (
  gameNightsRepository: IGameNightsRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (
    userId: string,
    now: Date,
    { goingUserId }: { goingUserId?: string } = {},
  ): Promise<NightCard[]> => {
    const today = todayIn(PLAN_TIME_ZONE, now);
    const nights = (
      await gameNightsRepository.listVisibleFrom(
        userId,
        new Date(now.getTime() - READ_BACK_MS),
      )
    ).filter((night) => isUpcoming(night.startsAt, today));
    const cards = await nightCards(
      gameNightsRepository,
      userProfilesRepository,
      nights,
      userId,
    );
    return goingUserId === undefined
      ? cards
      : cards.filter((card) =>
          card.going.some((one) => one.userId === goingUserId),
        );
  };
};
