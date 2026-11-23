import { z } from "zod";
import {
  GAME_NIGHT_AUDIENCES,
  type GameNightChanges,
} from "@/src/entities/models/game-night.model";
import { addDays, atTimeIn, PLAN_TIME_ZONE } from "@/src/entities/week";

// D5's fields as its form sends them, for a new night and the host's Edit: the night's name, its
// day and its clock times in Eastern time (KTD9), the place, an address and a note that may be
// left empty, the seats and who sees it. The form's names are its labels' (Name, Note), so a
// field's error reads as the form says it.

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const nightDetails = {
  name: z.string().trim().min(1, "Name is required").max(80),
  date: z.iso.date(),
  startsAt: clock,
  endsAt: clock.nullable(),
  place: z.string().trim().min(1, "Place is required").max(120),
  address: optionalText(200),
  note: optionalText(500),
  capacity: z.number().int().min(1).max(99),
  audience: z.enum(GAME_NIGHT_AUDIENCES),
};

// The two switches (D5's Guests and invites), which Edit saves as each is flipped (rule 4).
export const nightSwitches = {
  attendeesCanInvite: z.boolean(),
  guestsAllowed: z.boolean(),
};

const detailsSchema = z.object(nightDetails);

// The night's columns from the form's details: it starts on its day's clock, and an end at or
// before the start is on the next day's, as a night that runs past midnight does.
export function detailsOf(
  details: z.infer<typeof detailsSchema>,
): Required<
  Omit<GameNightChanges, "attendeesCanInvite" | "guestsAllowed" | "linkToken">
> {
  const startsAt = atTimeIn(details.date, details.startsAt, PLAN_TIME_ZONE);
  const sameDayEnd =
    details.endsAt === null
      ? null
      : atTimeIn(details.date, details.endsAt, PLAN_TIME_ZONE);
  return {
    title: details.name,
    startsAt,
    endsAt:
      sameDayEnd === null || details.endsAt === null
        ? null
        : sameDayEnd > startsAt
          ? sameDayEnd
          : atTimeIn(addDays(details.date, 1), details.endsAt, PLAN_TIME_ZONE),
    place: details.place,
    address: details.address,
    hostNote: details.note,
    capacity: details.capacity,
    audience: details.audience,
  };
}
