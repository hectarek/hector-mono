ALTER TABLE "plan_entries" ADD COLUMN "eat_dates" date[] DEFAULT '{}'::date[] NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_entries" ADD COLUMN "cooked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Meals planned before eat days are eaten on the day they were planned for, and "eaten" was
-- the only check a meal had (docs/ux-plan.md D38, D39).
UPDATE "plan_entries" SET "eat_dates" = ARRAY["date"], "cooked" = "eaten";