import { z } from "zod";

export const stashItemTypeSchema = z.enum([
  "video",
  "article",
  "movie",
  "podcast",
  "other",
]);
export type StashItemType = z.infer<typeof stashItemTypeSchema>;

export const stashItemStatusSchema = z.enum(["queued", "completed"]);
export type StashItemStatus = z.infer<typeof stashItemStatusSchema>;

export const selectStashItemSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  url: z.url(),
  title: z.string(),
  description: z.string().nullable(),
  type: stashItemTypeSchema,
  status: stashItemStatusSchema,
  position: z.number().int(),
  thumbnailUrl: z.string().nullable(),
  source: z.string().nullable(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
});
export type StashItem = z.infer<typeof selectStashItemSchema>;

export const insertStashItemSchema = z.object({
  userId: z.string(),
  url: z.url(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: stashItemTypeSchema.optional(),
  thumbnailUrl: z.url().optional(),
  source: z.string().optional(),
});
export type StashItemInsert = z.infer<typeof insertStashItemSchema>;
