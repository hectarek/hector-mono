import { z } from "zod";
import { userSchema } from "./user.model";

export const sessionSchema = z.object({
  user: userSchema,
});

export type Session = z.infer<typeof sessionSchema>;
