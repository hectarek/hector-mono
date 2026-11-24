import { z } from "zod";

export const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  // The picture the sign-in came with: Google's, for a Google account; none for an email one.
  image: z.string().nullish(),
});
export type User = z.infer<typeof userSchema>;
