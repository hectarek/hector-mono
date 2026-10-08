ALTER TABLE "spaces" ADD COLUMN "auto_name" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Books and plans still carrying the name they were given at sign-up follow their owner's name
-- from now on (ux-plan D83): those named as personalSpaceName would name them today, the
-- owner's first name and "'s Recipes" or "'s Plan", or "My Recipes" / "My Plan" for an account
-- with no name. One renamed since, or whose owner has changed their name, keeps its name.
-- Reads Neon Auth's user table, never writes it.
UPDATE "spaces"
SET "auto_name" = true
FROM (
	SELECT "space_members"."space_id", substring("user"."name" FROM '\S+') AS "first_name"
	FROM "space_members"
	LEFT JOIN "neon_auth"."user" "user" ON "user"."id" = "space_members"."user_id"
	WHERE "space_members"."role" = 'owner'
) "owner"
WHERE "owner"."space_id" = "spaces"."id"
	AND "spaces"."name" = CASE
		WHEN "owner"."first_name" IS NULL
			THEN CASE "spaces"."type" WHEN 'recipe-book' THEN 'My Recipes' ELSE 'My Plan' END
		ELSE "owner"."first_name" || '''s ' || CASE "spaces"."type" WHEN 'recipe-book' THEN 'Recipes' ELSE 'Plan' END
	END;
