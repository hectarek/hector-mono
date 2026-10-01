-- Books and plans still carrying the old generic names take their owner's first name
-- ("Hector's Plan", ux-plan D19): the rule personalSpaceName applies to new ones. An
-- account with no name keeps the generic one. Reads Neon Auth's user table, never writes it.
UPDATE "spaces"
SET "name" = "owner"."first_name" || '''s ' || CASE "spaces"."type" WHEN 'recipe-book' THEN 'Recipes' ELSE 'Plan' END
FROM (
	SELECT "space_members"."space_id", substring("user"."name" FROM '\S+') AS "first_name"
	FROM "space_members"
	JOIN "neon_auth"."user" "user" ON "user"."id" = "space_members"."user_id"
	WHERE "space_members"."role" = 'owner'
) "owner"
WHERE "owner"."space_id" = "spaces"."id"
	AND "owner"."first_name" IS NOT NULL
	AND (
		("spaces"."type" = 'recipe-book' AND "spaces"."name" = 'My Recipes')
		OR ("spaces"."type" = 'meal-plan' AND "spaces"."name" = 'My Plan')
	);
