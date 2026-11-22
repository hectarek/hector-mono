import { z } from "zod";
import {
  GAME_COMPLEXITIES,
  GAME_TYPES,
  type GameRecord,
} from "@/src/entities/models/game.model";

// The suggestion's and the game record's fields as their forms send them (B9, G3, G4): text that
// may be left empty, a year, a link, counts and lists. An empty field is no value (rule 14).

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const requiredTitle = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200);

export const optionalYear = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{4}$/.test(value),
    "Enter a year, like 2019",
  )
  .transform((value) => (value === "" ? null : Number(value)));

export const optionalLink = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === "" || (URL.canParse(value) && /^https?:\/\//.test(value)),
    "Enter the whole link, starting with https://",
  )
  .transform((value) => (value === "" ? null : value));

const optionalCount = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{1,3}$/.test(value), "Enter a number")
  .transform((value) => (value === "" ? null : Number(value)));

// A list typed with commas between: "Ines Varga, Tom Reed".
const optionalList = z
  .string()
  .trim()
  .max(500)
  .transform((value) => {
    const items = [
      ...new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item !== ""),
      ),
    ];
    return items.length ? items : null;
  });

const optionalCounts = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{1,2}(\s*,\s*\d{1,2})*$/.test(value),
    "Enter numbers with commas between, like 3, 4",
  )
  .transform((value) =>
    value === ""
      ? null
      : [...new Set(value.split(",").map((count) => Number(count.trim())))],
  );

// G3's and G4's fields, all but the title optional (R5).
export const gameRecordSchema = z.object({
  type: z.enum(GAME_TYPES),
  baseGameId: z
    .union([z.uuid(), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  title: requiredTitle,
  year: optionalYear,
  publishers: optionalList,
  designers: optionalList,
  minPlayers: optionalCount,
  maxPlayers: optionalCount,
  bestPlayers: optionalCounts,
  minMinutes: optionalCount,
  maxMinutes: optionalCount,
  minAge: optionalCount,
  complexity: z
    .union([z.enum(GAME_COMPLEXITIES), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  categories: optionalList,
  description: optionalText(4000),
  imageUrl: optionalLink,
  videoUrl: optionalLink,
});

// The record's own fields from a parsed form that carries others too (the photo, the
// suggestion), so nothing else reaches the row.
export const gameRecordOf = ({
  type,
  baseGameId,
  title,
  year,
  publishers,
  designers,
  minPlayers,
  maxPlayers,
  bestPlayers,
  minMinutes,
  maxMinutes,
  minAge,
  complexity,
  categories,
  description,
  imageUrl,
  videoUrl,
}: z.infer<typeof gameRecordSchema>): GameRecord => ({
  type,
  baseGameId,
  title,
  year,
  publishers,
  designers,
  minPlayers,
  maxPlayers,
  bestPlayers,
  minMinutes,
  maxMinutes,
  minAge,
  complexity,
  categories,
  description,
  imageUrl,
  videoUrl,
});
