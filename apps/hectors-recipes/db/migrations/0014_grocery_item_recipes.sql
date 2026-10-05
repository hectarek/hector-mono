CREATE TABLE "grocery_item_recipes" (
	"item_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"quantity" numeric,
	CONSTRAINT "grocery_item_recipes_item_id_recipe_id_pk" PRIMARY KEY("item_id","recipe_id")
);
--> statement-breakpoint
ALTER TABLE "grocery_item_recipes" ADD CONSTRAINT "grocery_item_recipes_item_id_grocery_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."grocery_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_item_recipes" ADD CONSTRAINT "grocery_item_recipes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grocery_item_recipes_recipe_idx" ON "grocery_item_recipes" USING btree ("recipe_id");