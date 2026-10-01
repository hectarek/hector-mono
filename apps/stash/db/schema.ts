import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const stashItems = pgTable("stash_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", {
    enum: ["video", "article", "movie", "podcast", "other"],
  })
    .notNull()
    .default("other"),
  status: text("status", { enum: ["queued", "completed"] })
    .notNull()
    .default("queued"),
  position: integer("position").notNull().default(0),
  thumbnailUrl: text("thumbnail_url"),
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
