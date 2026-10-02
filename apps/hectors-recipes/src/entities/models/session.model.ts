import { z } from "zod";
import { userSchema } from "./user.model";

const sessionSchema = z.object({
  user: userSchema,
});

export type Session = z.infer<typeof sessionSchema>;
