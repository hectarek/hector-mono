ALTER TABLE "jobs" DROP CONSTRAINT "jobs_review_state_check";--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_dismiss_reason_check";--> statement-breakpoint
ALTER TABLE "settings" DROP CONSTRAINT "settings_pending_cap_check";--> statement-breakpoint
DROP INDEX "jobs_owner_id_review_state_idx";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "review_state";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "dismiss_reason";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "dismiss_note";--> statement-breakpoint
ALTER TABLE "settings" DROP COLUMN "pending_cap";