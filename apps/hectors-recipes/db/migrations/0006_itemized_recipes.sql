CREATE TABLE "recipe_steps" (
	"recipe_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"timer_minutes" integer,
	CONSTRAINT "recipe_steps_recipe_id_position_pk" PRIMARY KEY("recipe_id","position"),
	CONSTRAINT "recipe_steps_timer_check" CHECK ("recipe_steps"."timer_minutes" is null or "recipe_steps"."timer_minutes" > 0)
);
--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "aisle" text;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD COLUMN "optional" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_aisle_check" CHECK ("ingredients"."aisle" in ('produce', 'meat-and-seafood', 'dairy-and-eggs', 'bakery', 'pantry', 'canned-and-jarred', 'baking', 'spices-and-seasonings', 'condiments-and-sauces', 'frozen', 'drinks'));