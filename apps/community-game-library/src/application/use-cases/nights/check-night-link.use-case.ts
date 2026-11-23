import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import type { GameNight } from "@/src/entities/models/game-night.model";
import { seatsOpen, waitlistOf } from "@/src/entities/night";

export type ICheckNightLinkUseCase = ReturnType<typeof checkNightLinkUseCase>;

// The night a link opens, while it works: a replaced link, or one whose night was cancelled, is
// Not found, and its page says "This link no longer works" (screens.md).
export async function workingNightLink(
  gameNightsRepository: IGameNightsRepository,
  token: string,
): Promise<GameNight> {
  const night = await gameNightsRepository.getByLinkToken(token);
  if (!night || night.cancelledAt !== null) {
    throw new NotFoundError();
  }
  return night;
}

// A night's link opened signed out (D14, R36): only its title, its start and its seats, never
// its place or its people.
export const checkNightLinkUseCase = (
  gameNightsRepository: IGameNightsRepository,
) => {
  return async (token: string) => {
    const night = await workingNightLink(gameNightsRepository, token);
    const list = await gameNightsRepository.listAttendees([night.id]);
    return {
      title: night.title,
      startsAt: night.startsAt,
      capacity: night.capacity,
      seatsOpen: seatsOpen(night.capacity, list),
      waitlisted: waitlistOf(list).length,
    };
  };
};
