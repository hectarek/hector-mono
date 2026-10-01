-- Meals the code before Phase 13 added after 0009 have no eat days: they're eaten on the day
-- they were planned for, and "eaten" was their only check (docs/ux-plan.md P13.6).
UPDATE "plan_entries" SET "eat_dates" = ARRAY["date"], "cooked" = "eaten" WHERE cardinality("eat_dates") = 0;--> statement-breakpoint
ALTER TABLE "plan_entries" ALTER COLUMN "eat_dates" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "plan_entries" DROP COLUMN "eaten";--> statement-breakpoint
ALTER TABLE "plan_entries" ADD CONSTRAINT "plan_entries_eat_dates_check" CHECK (cardinality("plan_entries"."eat_dates") >= 1);