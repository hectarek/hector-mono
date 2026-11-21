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
