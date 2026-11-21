import { z } from "zod";
import { PIECE_COLORS, PIECE_SHAPES } from "../piece";

// What a member's friends see of them (docs/data-model.md, user_profiles): the name the app shows,
// and their piece (R40, R51). The phone and the photo show only to their friends and to the other
// person in a loan or a pass-along (KTD4).
export const userProfileSchema = z.object({
  userId: z.uuid(),
  name: z.string().min(1),
  pieceShape: z.enum(PIECE_SHAPES),
  pieceColor: z.enum(PIECE_COLORS),
  phone: z.string().nullable(),
  // Its key in the private bucket (rule 14, KTD11).
  photoKey: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;
