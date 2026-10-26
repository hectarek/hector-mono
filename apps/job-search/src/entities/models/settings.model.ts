import { z } from "zod";
import { timeSchema } from "./time.model";

// The week's counts (R10), each with a weekly target Hector sets (R12).
export const WEEKLY_COUNTS = [
  "messagesSent",
  "conversationsHeld",
  "applications",
  "practiceSessions",
  "screensReached",
] as const;
type WeeklyCount = (typeof WEEKLY_COUNTS)[number];

// The most proposals that wait for Hector's review at once, until he sets another (KTD8).
const DEFAULT_PENDING_CAP = 10;

// Hector's settings, which only he changes (R12, R21): a target for each weekly count, null where
// he set none, and the cap on pending proposals.
export type Settings = {
  targets: Record<WeeklyCount, number | null>;
  pendingCap: number;
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
  pendingCap: DEFAULT_PENDING_CAP,
  updatedAt: null,
};

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
  pendingCap: z
    .int({ error: "Use a whole number" })
    .min(1, { error: "At least 1" })
    .max(50, { error: "At most 50" }),
  updatedAt: timeSchema.nullable(),
});
export type UpdateSettingsInput = z.output<typeof updateSettingsSchema>;
