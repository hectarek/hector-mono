CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"website" text,
	"location" text,
	"headcount" integer,
	"industry" text,
	"office_policy" text,
	"leave_policy" text,
	"tier" integer,
	"research_summary" text,
	"research_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "companies_tier_check" CHECK ("companies"."tier" between 1 and 3),
	CONSTRAINT "companies_headcount_check" CHECK ("companies"."headcount" > 0)
);
--> statement-breakpoint
CREATE TABLE "lead_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"messages_sent_target" integer,
	"conversations_held_target" integer,
	"applications_target" integer,
	"practice_sessions_target" integer,
	"screens_reached_target" integer,
	"pending_cap" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "settings_targets_check" CHECK ("settings"."messages_sent_target" >= 0 and "settings"."conversations_held_target" >= 0 and "settings"."applications_target" >= 0 and "settings"."practice_sessions_target" >= 0 and "settings"."screens_reached_target" >= 0),
	CONSTRAINT "settings_pending_cap_check" CHECK ("settings"."pending_cap" >= 1)
);
--> statement-breakpoint
CREATE INDEX "companies_owner_id_name_key_idx" ON "companies" USING btree ("owner_id","name_key");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_sources_owner_id_name_key_idx" ON "lead_sources" USING btree ("owner_id","name_key");