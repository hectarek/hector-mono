import { z } from "zod";

// One game or expansion in the catalog (docs/data-model.md, games). Only its type and title are
// required: a screen shows a value only when the game has it (rule 14).
export const GAME_TYPES = ["base-game", "expansion"] as const;
export const GAME_COMPLEXITIES = ["light", "medium", "heavy"] as const;

export const gameSchema = z.object({
  id: z.uuid(),
  type: z.enum(GAME_TYPES),
  // Set exactly on an expansion: the game it expands.
  baseGameId: z.uuid().nullable(),
  title: z.string().min(1),
  // The title as search matches it (src/entities/search-title.ts), written with the title.
  searchTitle: z.string(),
  year: z.number().int().nullable(),
  publishers: z.array(z.string()).nullable(),
  designers: z.array(z.string()).nullable(),
  minPlayers: z.number().int().nullable(),
  maxPlayers: z.number().int().nullable(),
  bestPlayers: z.array(z.number().int()).nullable(),
  minMinutes: z.number().int().nullable(),
  maxMinutes: z.number().int().nullable(),
  minAge: z.number().int().nullable(),
  complexity: z.enum(GAME_COMPLEXITIES).nullable(),
  categories: z.array(z.string()).nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  // The image's credit as its source asks for it, who made it and its licence ("Ines Varga,
  // CC BY-SA 4.0"), and the page that gives it. They belong to the image: a new one leaves
  // them behind (G4).
  imageCredit: z.string().nullable(),
  imageSourceUrl: z.string().nullable(),
  videoUrl: z.string().nullable(),
  popularity: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Game = z.infer<typeof gameSchema>;

// What the admin writes of a game (G3, G4; R5): every field but those the app keeps itself, the
// search title written with the title (KTD10).
export type GameRecord = Omit<
  Game,
  "id" | "searchTitle" | "popularity" | "createdAt" | "updatedAt"
>;
