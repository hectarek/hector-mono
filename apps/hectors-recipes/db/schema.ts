import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { AISLES, type Aisle } from "@/src/entities/aisles";
import type {
  InviteRole,
  SpaceRole,
  SpaceType,
} from "@/src/entities/models/space.model";
import {
  TAG_CATEGORIES,
  type TagCategory,
} from "@/src/entities/models/tag.model";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").$type<SpaceType>().notNull(),
    name: text("name").notNull(),
    // Still the name it was given at sign-up ("Hector's Recipes"), so it shows its owner's
    // current name until someone renames it (docs/ux-plan.md D83).
    autoName: boolean("auto_name").notNull().default(false),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // Target for the (space_id, space_type) foreign keys on content tables.
    unique("spaces_id_type_unique").on(table.id, table.type),
    check(
      "spaces_type_check",
      sql`${table.type} in ('recipe-book', 'meal-plan')`,
    ),
  ],
);

export const spaceMembers = pgTable(
  "space_members",
  {
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: text("role").$type<SpaceRole>().notNull(),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.userId] }),
    uniqueIndex("space_members_one_owner_idx")
      .on(table.spaceId)
      .where(sql`${table.role} = 'owner'`),
    index("space_members_user_idx").on(table.userId),
    check(
      "space_members_role_check",
      sql`${table.role} in ('owner', 'editor', 'viewer')`,
    ),
  ],
);

// Each person's choices: the plan and the book the app opens to (ux-plan D14, D17). No
// default book means All recipes when they're in two or more. Leaving a space leaves the
// id here, but only spaces they're still in count.
export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id").primaryKey(),
  defaultPlanId: uuid("default_plan_id").references(() => spaces.id, {
    onDelete: "set null",
  }),
  defaultBookId: uuid("default_book_id").references(() => spaces.id, {
    onDelete: "set null",
  }),
  updatedAt: updatedAt(),
});

export const spaceInvites = pgTable(
  "space_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    role: text("role").$type<InviteRole>().notNull().default("editor"),
    createdBy: uuid("created_by").notNull(),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "space_invites_role_check",
      sql`${table.role} in ('editor', 'viewer')`,
    ),
  ],
);

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id").notNull(),
    spaceType: text("space_type")
      .$type<"recipe-book">()
      .notNull()
      .default("recipe-book"),
    createdBy: uuid("created_by").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    timeMinutes: integer("time_minutes"),
    yieldServings: integer("yield_servings"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    sourceUrl: text("source_url"),
    imageUrl: text("image_url"),
    // A video of the recipe, shown in the photo's place (docs/ux-plan.md D72, D81).
    videoUrl: text("video_url"),
    copiedFromRecipeId: uuid("copied_from_recipe_id").references(
      (): AnyPgColumn => recipes.id,
      { onDelete: "set null" },
    ),
    externalRef: text("external_ref"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.spaceId, table.spaceType],
      foreignColumns: [spaces.id, spaces.type],
    }).onDelete("cascade"),
    check("recipes_space_type_check", sql`${table.spaceType} = 'recipe-book'`),
    index("recipes_space_idx").on(table.spaceId),
    index("recipes_tags_idx").using("gin", table.tags),
    uniqueIndex("recipes_space_external_ref_unique_idx")
      .on(table.spaceId, table.externalRef)
      .where(sql`${table.externalRef} is not null`),
  ],
);

export const ingredients = pgTable(
  "ingredients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    // Where it's found in a store (ux-plan D25); null until something sets it.
    aisle: text("aisle").$type<Aisle>(),
  },
  (table) => [
    uniqueIndex("ingredients_name_unique_idx").on(table.name),
    check(
      "ingredients_aisle_check",
      sql`${table.aisle} in (${sql.raw(AISLES.map((aisle) => `'${aisle}'`).join(", "))})`,
    ),
  ],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    section: text("section"),
    raw: text("raw").notNull(),
    quantity: numeric("quantity", { mode: "number" }),
    unit: text("unit"),
    ingredientId: uuid("ingredient_id").references(() => ingredients.id, {
      onDelete: "set null",
    }),
    // Itemized (ux-plan D23): the name as written, a note (prep, serving or a swap: on the
    // recipe, not the grocery list) and whether it's optional. `raw` is the original line.
    name: text("name"),
    note: text("note"),
    optional: boolean("optional").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.recipeId, table.position] })],
);

// A recipe's steps, itemized (ux-plan D24), mirroring its ingredient lines: saving replaces
// the whole list, so rows have no ids of their own.
export const recipeSteps = pgTable(
  "recipe_steps",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    timerMinutes: integer("timer_minutes"),
    // The heading over this step and the ones after it that share it (ux-plan D35).
    section: text("section"),
  },
  (table) => [
    primaryKey({ columns: [table.recipeId, table.position] }),
    check(
      "recipe_steps_timer_check",
      sql`${table.timerMinutes} is null or ${table.timerMinutes} > 0`,
    ),
  ],
);

export const planEntries = pgTable(
  "plan_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id").notNull(),
    spaceType: text("space_type")
      .$type<"meal-plan">()
      .notNull()
      .default("meal-plan"),
    // The day it's cooked (docs/ux-plan.md D38); the column is older than eat days.
    cookDate: date("date", { mode: "string" }).notNull(),
    // The days it's eaten, sorted: at least one, none before the cook day.
    eatDates: date("eat_dates", { mode: "string" }).array().notNull(),
    title: text("title").notNull(),
    recipeId: uuid("recipe_id").references(() => recipes.id, {
      onDelete: "set null",
    }),
    // Only the cook day is checked off (D39).
    cooked: boolean("cooked").notNull().default(false),
    // When this meal's ingredients were last put on the list, so adding again doesn't buy
    // everything twice. Null: never added.
    addedToListAt: timestamp("added_to_list_at", { withTimezone: true }),
    createdBy: uuid("created_by").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.spaceId, table.spaceType],
      foreignColumns: [spaces.id, spaces.type],
    }).onDelete("cascade"),
    check(
      "plan_entries_space_type_check",
      sql`${table.spaceType} = 'meal-plan'`,
    ),
    check(
      "plan_entries_eat_dates_check",
      sql`cardinality(${table.eatDates}) >= 1`,
    ),
    index("plan_entries_space_date_idx").on(table.spaceId, table.cookDate),
  ],
);

export const groceryItems = pgTable(
  "grocery_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id").notNull(),
    // A plan's grocery list: its items live in the plan and share its members.
    spaceType: text("space_type")
      .$type<"meal-plan">()
      .notNull()
      .default("meal-plan"),
    text: text("text").notNull(),
    checked: boolean("checked").notNull().default(false),
    quantity: numeric("quantity", { mode: "number" }),
    unit: text("unit"),
    ingredientId: uuid("ingredient_id").references(() => ingredients.id, {
      onDelete: "set null",
    }),
    // No longer read or written (ux-plan D59): `grocery_item_recipes` says which recipes an
    // item is for. Dropped after the deploy that stopped using it (two deploys, L8).
    sourceNote: text("source_note"),
    createdBy: uuid("created_by").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.spaceId, table.spaceType],
      foreignColumns: [spaces.id, spaces.type],
    }).onDelete("cascade"),
    check(
      "grocery_items_space_type_check",
      sql`${table.spaceType} = 'meal-plan'`,
    ),
    index("grocery_items_space_idx").on(table.spaceId),
  ],
);

// The recipes a grocery item is for, each with its share of the item's amount (ux-plan D59).
// An item merged from several recipes has a row for each. Deleting a recipe drops its rows,
// and the item stays.
export const groceryItemRecipes = pgTable(
  "grocery_item_recipes",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => groceryItems.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { mode: "number" }),
    // The order links were made in, so an item's recipes read in the order they were added
    // (D60). Links made together are numbered in the order they're written.
    linkOrder: integer("link_order").generatedAlwaysAsIdentity(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.recipeId] }),
    index("grocery_item_recipes_recipe_idx").on(table.recipeId),
  ],
);

// Each AI read of a recipe (photo, pasted text, or a page without recipe data), so one
// account can't spend the month's reading budget (docs/ux-plan.md D48). A page's own recipe
// data is read without AI and isn't recorded.
export const recipeReads = pgTable(
  "recipe_reads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    kind: text("kind").$type<"image" | "text" | "document">().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("recipe_reads_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

// A person's saved recipes (docs/ux-plan.md D77): their own, whatever book a recipe is in, so
// a phone and a laptop agree. Gone with the recipe.
export const recipeBookmarks = pgTable(
  "recipe_bookmarks",
  {
    userId: uuid("user_id").notNull(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.recipeId] }),
    index("recipe_bookmarks_recipe_idx").on(table.recipeId),
  ],
);

// Each grouped tag's group (docs/ux-plan.md D55), for grouping recipes and the tag picker. Only
// a tag with a group has a row; recipes keep their tags by name (`recipes.tags`).
export const tags = pgTable(
  "tags",
  {
    name: text("name").primaryKey(),
    category: text("category").$type<TagCategory>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "tags_category_check",
      sql`${table.category} in (${sql.raw(TAG_CATEGORIES.map((category) => `'${category}'`).join(", "))})`,
    ),
  ],
);
