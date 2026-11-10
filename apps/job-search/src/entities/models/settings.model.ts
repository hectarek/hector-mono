import { z } from "zod";
import { timeSchema } from "./input.model";

// The week's counts (R10), each with a weekly target Hector sets (R12).
export const WEEKLY_COUNTS = [
  "messagesSent",
  "conversationsHeld",
  "applications",
  "practiceSessions",
  "screensReached",
] as const;
export type WeeklyCount = (typeof WEEKLY_COUNTS)[number];

// Hector's settings, which only he changes (R12, R21): a target for each weekly count, null where
// he set none, and the yearly pay floor the ranked list weighs a posted band against (KTD23), null
// when unset.
export type Settings = {
  targets: Record<WeeklyCount, number | null>;
  payFloor: number | null;
  // When they were last saved, which a change sends back (R22): null before the first save.
  updatedAt: Date | null;
};

export type SettingsValues = Omit<Settings, "updatedAt">;

// The settings until Hector saves his own.
export const DEFAULT_SETTINGS: Settings = {
  targets: {
    messagesSent: null,
    conversationsHeld: null,
    applications: null,
    practiceSessions: null,
    screensReached: null,
  },
  payFloor: null,
  updatedAt: null,
};

// get_settings takes nothing.
export const getSettingsSchema = z.object({});

const targetSchema = z
  .int({ error: "Use a whole number" })
  .min(0, { error: "At least 0" })
  .max(1000, { error: "At most 1000" })
  .nullable();

// The settings form's input: every value, and the updatedAt it read, null when no settings were
// saved yet.
export const updateSettingsSchema = z.object({
  targets: z.object({
    messagesSent: targetSchema,
    conversationsHeld: targetSchema,
    applications: targetSchema,
    practiceSessions: targetSchema,
    screensReached: targetSchema,
  }),
  payFloor: z
    .int({ error: "Use whole dollars a year" })
    .min(0, { error: "At least 0" })
    .max(10_000_000, { error: "At most 10,000,000" })
    .nullable(),
  updatedAt: timeSchema.nullable(),
});
export type UpdateSettingsInput = z.output<typeof updateSettingsSchema>;
