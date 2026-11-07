CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"day" date NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"effort" text NOT NULL,
	"title" text NOT NULL,
	"done_when" text,
	"state" text NOT NULL,
	"what_happened" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "blocks_effort_check" CHECK ("blocks"."effort" in ('networking', 'applying', 'practice', 'projects', 'upkeep')),
	CONSTRAINT "blocks_state_check" CHECK ("blocks"."state" in ('planned', 'done', 'partial', 'moved', 'skipped')),
	CONSTRAINT "blocks_times_check" CHECK ("blocks"."ends_at" > "blocks"."starts_at")
);
--> statement-breakpoint
CREATE INDEX "blocks_owner_id_day_idx" ON "blocks" USING btree ("owner_id","day","starts_at");