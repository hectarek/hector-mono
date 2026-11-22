import { z } from "zod";
import { NOTICE_GROUPS } from "../notice-types";

// A member's settings (docs/data-model.md, user_settings): My library's pass-along switch, the
// default for copies added later (R48), and the notice groups switched off (E7, R28).
export const userSettingsSchema = z.object({
  userId: z.uuid(),
  defaultPassAlong: z.boolean(),
  noticesOff: z.array(z.enum(NOTICE_GROUPS)),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

// What My library's switch (B6) and Notices I get (E7) change.
export type UserSettingsChanges = Partial<
  Pick<UserSettings, "defaultPassAlong" | "noticesOff">
>;

// A new member's settings, made with their profile: the database's defaults (pass-along off, and
// only the morning-of-a-night reminder off) for what isn't given.
export type NewUserSettings = Pick<UserSettings, "userId"> &
  UserSettingsChanges;
