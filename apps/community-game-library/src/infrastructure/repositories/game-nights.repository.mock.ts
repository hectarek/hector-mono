import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { GameNight } from "@/src/entities/models/game-night.model";
import type { GameNightAttendee } from "@/src/entities/models/game-night-attendee.model";

export class MockGameNightsRepository implements IGameNightsRepository {
  // The nights and their lists its reads see, which a test puts here.
  readonly nights: GameNight[] = [];
  readonly attendees: GameNightAttendee[] = [];

  async listGoingToNightsStarting(
    from: Date,
    to: Date,
  ): Promise<{ gameNightId: string; userId: string; startsAt: Date }[]> {
    return this.nights
      .filter(
        (night) =>
          night.startsAt >= from &&
          night.startsAt < to &&
          night.cancelledAt === null,
      )
      .flatMap((night) =>
        this.attendees
          .filter(
            (one) => one.gameNightId === night.id && one.status === "going",
          )
          .map((one) => ({
            gameNightId: night.id,
            userId: one.userId,
            startsAt: night.startsAt,
          })),
      );
  }
}
