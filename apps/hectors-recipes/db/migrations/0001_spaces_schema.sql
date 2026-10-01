CREATE TABLE "grocery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"space_type" text DEFAULT 'grocery-list' NOT NULL,
	"text" text NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"quantity" numeric,
	"unit" text,
	"ingredient_id" uuid,
	"source_note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grocery_items_space_type_check" CHECK ("grocery_items"."space_type" = 'grocery-list')
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"space_type" text DEFAULT 'meal-plan' NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"recipe_id" uuid,
	"eaten" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_entries_space_type_check" CHECK ("plan_entries"."space_type" = 'meal-plan')
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"recipe_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"section" text,
	"raw" text NOT NULL,
	"quantity" numeric,
	"unit" text,
	"ingredient_id" uuid,
	CONSTRAINT "recipe_ingredients_recipe_id_position_pk" PRIMARY KEY("recipe_id","position")
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"space_type" text DEFAULT 'recipe-book' NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"instructions" text DEFAULT '' NOT NULL,
	"time_minutes" integer,
	"yield_servings" integer,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"source_url" text,
	"image_url" text,
	"copied_from_recipe_id" uuid,
	"external_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_space_type_check" CHECK ("recipes"."space_type" = 'recipe-book')
);
--> statement-breakpoint
CREATE TABLE "space_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"token" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "space_invites_token_unique" UNIQUE("token"),
	CONSTRAINT "space_invites_role_check" CHECK ("space_invites"."role" in ('editor', 'viewer'))
);
--> statement-breakpoint
CREATE TABLE "space_members" (
	"space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_members_space_id_user_id_pk" PRIMARY KEY("space_id","user_id"),
	CONSTRAINT "space_members_role_check" CHECK ("space_members"."role" in ('owner', 'editor', 'viewer'))
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_id_type_unique" UNIQUE("id","type"),
	CONSTRAINT "spaces_type_check" CHECK ("spaces"."type" in ('recipe-book', 'meal-plan', 'grocery-list'))
);
--> statement-breakpoint
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_space_id_space_type_spaces_id_type_fk" FOREIGN KEY ("space_id","space_type") REFERENCES "public"."spaces"("id","type") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_entries" ADD CONSTRAINT "plan_entries_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_entries" ADD CONSTRAINT "plan_entries_space_id_space_type_spaces_id_type_fk" FOREIGN KEY ("space_id","space_type") REFERENCES "public"."spaces"("id","type") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_copied_from_recipe_id_recipes_id_fk" FOREIGN KEY ("copied_from_recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_space_id_space_type_spaces_id_type_fk" FOREIGN KEY ("space_id","space_type") REFERENCES "public"."spaces"("id","type") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_invites" ADD CONSTRAINT "space_invites_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grocery_items_space_idx" ON "grocery_items" USING btree ("space_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_name_unique_idx" ON "ingredients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "plan_entries_space_date_idx" ON "plan_entries" USING btree ("space_id","date");--> statement-breakpoint
CREATE INDEX "recipes_space_idx" ON "recipes" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "recipes_tags_idx" ON "recipes" USING gin ("tags");--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_space_external_ref_unique_idx" ON "recipes" USING btree ("space_id","external_ref") WHERE "recipes"."external_ref" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "space_members_one_owner_idx" ON "space_members" USING btree ("space_id") WHERE "space_members"."role" = 'owner';--> statement-breakpoint
CREATE INDEX "space_members_user_idx" ON "space_members" USING btree ("user_id");