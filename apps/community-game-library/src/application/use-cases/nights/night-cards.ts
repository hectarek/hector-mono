import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { GameNight } from "@/src/entities/models/game-night.model";
import type { GameNightAttendee } from "@/src/entities/models/game-night-attendee.model";
import {
  formerMember,
  type NameAndPiece,
} from "@/src/entities/models/user-profile.model";
import { seatsOpen } from "@/src/entities/night";

// What D1's cards, E3's rows and a night's page share: each night with its host, the people going
// and the member's own place on it.
// The member's own place on a night, which its stamp says (screens.md rule 7).
export type NightRole = "host" | GameNightAttendee["status"] | null;

// Someone going, with the guests they bring (R47).
export type NightGoer = NameAndPiece & { guestCount: number };

// A night as D1's card and E3's row show it.
export type NightCard = {
  night: GameNight;
  host: NameAndPiece;
  you: NightRole;
  // The host first, then in the order they said they're going.
  going: NightGoer[];
  seatsOpen: number;
  waitlisted: number;
};

// The cards for a member's nights, from their list and the people on it.
export async function nightCards(
  gameNightsRepository: IGameNightsRepository,
  userProfilesRepository: IUserProfilesRepository,
  nights: readonly GameNight[],
  userId: string,
): Promise<NightCard[]> {
  const lists = await gameNightsRepository.listAttendees(
    nights.map((night) => night.id),
  );
  const people = new Map(
    (
      await userProfilesRepository.getManyByUserIds([
        ...new Set([
          ...nights.map((night) => night.createdBy),
          ...lists
            .filter((one) => one.status === "going")
            .map((one) => one.userId),
        ]),
      ])
    ).map((person) => [person.userId, person]),
  );
  return nights.flatMap((night) => {
    // A host whose account is gone shows as A former member (U22).
    const host = people.get(night.createdBy) ?? formerMember(night.createdBy);
    const list = lists.filter((one) => one.gameNightId === night.id);
    const going = list
      .filter((one) => one.status === "going")
      .sort(
        (a, b) =>
          Number(b.userId === night.createdBy) -
          Number(a.userId === night.createdBy),
      )
      .flatMap((one) => {
        const person = people.get(one.userId);
        return person ? [{ ...person, guestCount: one.guestCount }] : [];
      });
    return [
      {
        night,
        host,
        you:
          night.createdBy === userId
            ? "host"
            : (list.find((one) => one.userId === userId)?.status ?? null),
        going,
        seatsOpen: seatsOpen(night.capacity, list),
        waitlisted: list.filter((one) => one.status === "waitlisted").length,
      },
    ];
  });
}
