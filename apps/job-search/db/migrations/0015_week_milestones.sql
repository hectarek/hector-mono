-- Each week's milestone moves from its review to the week's plan (R10 as revised 2026-11-10, U20),
-- where Monday's planning sets it from now on. A blank one stays behind. The plan keeps the
-- review's times, updated_at to the millisecond as every updated_at is, so an edit sent against it
-- matches. weekly_reviews.milestone stays, unread, until a later migration drops it.
INSERT INTO "week_plans" ("owner_id", "week", "milestone", "created_at", "updated_at")
SELECT "owner_id", "week", "milestone", "created_at", date_trunc('milliseconds', "updated_at")
FROM "weekly_reviews"
WHERE "milestone" IS NOT NULL AND btrim("milestone") <> '';
