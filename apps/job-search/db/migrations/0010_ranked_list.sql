ALTER TABLE "jobs" ALTER COLUMN "review_state" SET DEFAULT 'accepted';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "pending_cap" SET DEFAULT 10;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "posted_on" date;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "pinned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "pay_floor" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_score_check" CHECK ("jobs"."score" between 1 and 10);--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_pay_floor_check" CHECK ("settings"."pay_floor" >= 0);