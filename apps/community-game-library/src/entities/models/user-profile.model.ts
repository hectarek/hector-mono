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

// What anyone who sees a member is shown: their name and piece, wherever they appear (R51). A
// list of people reads only this, so a stranger's phone and photo never load with it (KTD4).
export type NameAndPiece = Pick<
  UserProfile,
  "userId" | "name" | "pieceShape" | "pieceColor"
>;

// A new member's profile (A4). A photo comes after, through its own step.
export type NewUserProfile = NameAndPiece & { phone?: string | null };

// What an edit (E6) or a photo's step changes.
export type UserProfileChanges = Partial<
  Pick<UserProfile, "name" | "pieceShape" | "pieceColor" | "phone" | "photoKey">
>;

// What A4 and E6 send: the name is required, the photo goes by its own step, and the phone, when
// it's left empty, is cleared.
export const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(60, "Name is too long"),
  pieceShape: z.enum(PIECE_SHAPES),
  pieceColor: z.enum(PIECE_COLORS),
  phone: z
    .string()
    .trim()
    .max(40, "Phone is too long")
    .nullish()
    .transform((phone) => phone || null),
});
export type ProfileForm = z.infer<typeof profileFormSchema>;
