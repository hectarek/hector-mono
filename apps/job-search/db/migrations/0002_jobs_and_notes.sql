CREATE TABLE "job_status_changes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_status_changes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"owner_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"occurred_on" date NOT NULL,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"client_name" text,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"next_step" text,
	"next_date" date,
	"applied_on" date,
	"target_role" text,
	"level" text,
	"location" text,
	"work_mode" text,
	"pay_min" integer,
	"pay_max" integer,
	"posting_url" text,
	"posting_key" text,
	"summary" text,
	"found_on" date NOT NULL,
	"lead_source_id" uuid NOT NULL,
	"travel_percent" integer,
	"employment_type" text,
	"team_size" integer,
	"review_state" text NOT NULL,
	"proposal_reason" text,
	"dismiss_reason" text,
	"dismiss_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "jobs_status_check" CHECK ("jobs"."status" in ('verify', 'target', 'applied', 'screen', 'onsite', 'offer', 'rejected', 'closed', 'stale', 'skipped', 'withdrawn', 'offer-accepted', 'offer-declined')),
	CONSTRAINT "jobs_review_state_check" CHECK ("jobs"."review_state" in ('pending', 'accepted', 'dismissed')),
	CONSTRAINT "jobs_level_check" CHECK ("jobs"."level" in ('junior', 'mid', 'senior', 'staff', 'principal')),
	CONSTRAINT "jobs_work_mode_check" CHECK ("jobs"."work_mode" in ('remote', 'hybrid', 'onsite')),
	CONSTRAINT "jobs_employment_type_check" CHECK ("jobs"."employment_type" in ('full-time', 'part-time', 'contract', 'contract-to-hire')),
	CONSTRAINT "jobs_dismiss_reason_check" CHECK ("jobs"."dismiss_reason" in ('not-hiring', 'wrong-level', 'wrong-location-or-mode', 'pay-too-low', 'company-too-small', 'other')),
	CONSTRAINT "jobs_pay_check" CHECK ("jobs"."pay_min" >= 0 and "jobs"."pay_max" >= 0 and "jobs"."pay_max" >= "jobs"."pay_min"),
	CONSTRAINT "jobs_travel_percent_check" CHECK ("jobs"."travel_percent" between 0 and 100),
	CONSTRAINT "jobs_team_size_check" CHECK ("jobs"."team_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"record_kind" text NOT NULL,
	"record_id" uuid NOT NULL,
	"author" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_status_changes" ADD CONSTRAINT "job_status_changes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_lead_source_id_lead_sources_id_fk" FOREIGN KEY ("lead_source_id") REFERENCES "public"."lead_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_status_changes_owner_id_occurred_on_idx" ON "job_status_changes" USING btree ("owner_id","occurred_on");--> statement-breakpoint
CREATE INDEX "job_status_changes_job_id_idx" ON "job_status_changes" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_owner_id_posting_key_idx" ON "jobs" USING btree ("owner_id","posting_key") WHERE "jobs"."posting_key" is not null;--> statement-breakpoint
CREATE INDEX "jobs_owner_id_review_state_idx" ON "jobs" USING btree ("owner_id","review_state","next_date");--> statement-breakpoint
CREATE INDEX "jobs_company_id_idx" ON "jobs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "notes_owner_id_record_idx" ON "notes" USING btree ("owner_id","record_kind","record_id","created_at");