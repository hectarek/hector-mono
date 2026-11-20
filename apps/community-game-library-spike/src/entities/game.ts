import { z } from "zod";

export const complexitySchema = z.enum(["light", "medium", "heavy"]);

export const gameSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["base-game", "expansion"]),
  title: z.string().min(1),
  year: z.number().int().nullable(),
  publishers: z.array(z.string()).nullable(),
  minPlayers: z.number().int().nullable(),
  maxPlayers: z.number().int().nullable(),
  bestPlayers: z.array(z.number().int()).nullable(),
  minMinutes: z.number().int().nullable(),
  maxMinutes: z.number().int().nullable(),
  minAge: z.number().int().nullable(),
  complexity: complexitySchema.nullable(),
  description: z.string().nullable(),
  popularity: z.number().int().nullable(),
});

export type Game = z.infer<typeof gameSchema>;

export const searchInputSchema = z.object({
  query: z.string().trim().min(1).max(100),
});

export type SearchInput = z.infer<typeof searchInputSchema>;
