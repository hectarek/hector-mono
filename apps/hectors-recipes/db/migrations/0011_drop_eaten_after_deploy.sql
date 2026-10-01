-- 0010 dropped "eaten" while the deployed code still named it in its inserts (Drizzle lists
-- every column), so it was added back by hand on 2026-09-30 (docs/ux-plan.md P13.6). Apply
-- this only once code without the column in its schema is deployed.
ALTER TABLE "plan_entries" DROP COLUMN IF EXISTS "eaten";
