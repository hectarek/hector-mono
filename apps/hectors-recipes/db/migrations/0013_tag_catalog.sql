CREATE TABLE "tags" (
	"name" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_category_check" CHECK ("tags"."category" in ('meal', 'cuisine', 'diet'))
);--> statement-breakpoint
-- The tags the catalog starts with (ux-plan D58; STARTING_TAGS in src/entities/models/tag.model.ts):
-- the 19 the recipes use, each in its group, plus dairy-free and high-protein.
INSERT INTO "tags" ("name", "category") VALUES
	('breakfast', 'meal'), ('lunch', 'meal'), ('dinner', 'meal'), ('side dish', 'meal'),
	('snack', 'meal'), ('dessert', 'meal'), ('drink', 'meal'),
	('american', 'cuisine'), ('asian', 'cuisine'), ('greek', 'cuisine'), ('indian', 'cuisine'),
	('italian', 'cuisine'), ('mediterranean', 'cuisine'), ('mexican', 'cuisine'),
	('middle eastern', 'cuisine'), ('swedish', 'cuisine'),
	('vegetarian', 'diet'), ('vegan', 'diet'), ('gluten-free', 'diet'), ('dairy-free', 'diet'),
	('high-protein', 'diet');
