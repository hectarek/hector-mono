-- A plan's grocery list becomes part of the plan (ux-plan D13): each list's items move onto
-- the oldest plan its owner owns, then the lists are deleted with their members and links.
ALTER TABLE "grocery_items" DROP CONSTRAINT "grocery_items_space_type_check";--> statement-breakpoint
ALTER TABLE "spaces" DROP CONSTRAINT "spaces_type_check";--> statement-breakpoint
WITH "targets" AS (
	SELECT DISTINCT ON ("list"."id") "list"."id" AS "list_id", "plan"."id" AS "plan_id"
	FROM "spaces" "list"
	JOIN "space_members" "list_owner" ON "list_owner"."space_id" = "list"."id" AND "list_owner"."role" = 'owner'
	JOIN "space_members" "plan_owner" ON "plan_owner"."user_id" = "list_owner"."user_id" AND "plan_owner"."role" = 'owner'
	JOIN "spaces" "plan" ON "plan"."id" = "plan_owner"."space_id" AND "plan"."type" = 'meal-plan'
	WHERE "list"."type" = 'grocery-list'
	ORDER BY "list"."id", "plan"."created_at", "plan"."id"
)
UPDATE "grocery_items" SET "space_id" = "targets"."plan_id", "space_type" = 'meal-plan'
FROM "targets" WHERE "grocery_items"."space_id" = "targets"."list_id";--> statement-breakpoint
-- Deleting the lists would take any item left on one with it, so stop instead.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "grocery_items" WHERE "space_type" = 'grocery-list') THEN
		RAISE EXCEPTION 'A grocery list''s owner has no meal plan to move its items to';
	END IF;
END $$;--> statement-breakpoint
DELETE FROM "spaces" WHERE "type" = 'grocery-list';--> statement-breakpoint
ALTER TABLE "grocery_items" ALTER COLUMN "space_type" SET DEFAULT 'meal-plan';--> statement-breakpoint
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_space_type_check" CHECK ("grocery_items"."space_type" = 'meal-plan');--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_type_check" CHECK ("spaces"."type" in ('recipe-book', 'meal-plan'));
