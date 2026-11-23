import { z } from "zod";

// A game night (docs/data-model.md, game_nights). The host is created_by. The capacity counts the
// host and every guest. Its audience is where it's shared (D10): the host's friends, or only the
// people invited by name or by its link.
export const GAME_NIGHT_AUDIENCES = ["friends", "invited"] as const;

export const gameNightSchema = z.object({
  id: z.uuid(),
  createdBy: z.uuid(),
  title: z.string().min(1),
  startsAt: z.date(),
  endsAt: z.date().nullable(),
  place: z.string(),
  address: z.string().nullable(),
  hostNote: z.string().nullable(),
  capacity: z.number().int().positive(),
  audience: z.enum(GAME_NIGHT_AUDIENCES),
  attendeesCanInvite: z.boolean(),
  guestsAllowed: z.boolean(),
  linkToken: z.string().nullable(),
  cancelledAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type GameNight = z.infer<typeof gameNightSchema>;

// What a new night holds (D5), with its link for a night only invited people see (U19): the rest
// are the table's own.
export type NewGameNight = Pick<
  GameNight,
  | "createdBy"
  | "title"
  | "startsAt"
  | "endsAt"
  | "place"
  | "address"
  | "hostNote"
  | "capacity"
  | "audience"
  | "attendeesCanInvite"
  | "guestsAllowed"
> &
  Partial<Pick<GameNight, "linkToken">>;

// What the host's Edit changes (U18), a new link (U19), and cancelling (U21).
export type GameNightChanges = Partial<
  Omit<NewGameNight, "createdBy"> & Pick<GameNight, "cancelledAt">
>;
