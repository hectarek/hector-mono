CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"occurred_on" date NOT NULL,
	"job_id" uuid,
	"note" text,
	"state" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"author" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interactions_kind_check" CHECK ("interactions"."kind" in ('message-sent', 'reply-received', 'conversation')),
	CONSTRAINT "interactions_state_check" CHECK ("interactions"."state" in ('scheduled', 'held', 'cancelled', 'no-show')),
	CONSTRAINT "interactions_conversation_state_check" CHECK (("interactions"."kind" = 'conversation') = ("interactions"."state" is not null)),
	CONSTRAINT "interactions_times_check" CHECK ("interactions"."ends_at" > "interactions"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "job_people" (
	"owner_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_people_job_id_person_id_pk" PRIMARY KEY("job_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"role" text,
	"how_known" text,
	"rank" text,
	"ask" text,
	"next_step" text,
	"next_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "people_rank_check" CHECK ("people"."rank" in ('A', 'B', 'C'))
);
--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_people" ADD CONSTRAINT "job_people_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_people" ADD CONSTRAINT "job_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interactions_owner_id_occurred_on_idx" ON "interactions" USING btree ("owner_id","occurred_on");--> statement-breakpoint
CREATE INDEX "interactions_person_id_idx" ON "interactions" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "interactions_job_id_idx" ON "interactions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_people_person_id_idx" ON "job_people" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "people_owner_id_name_idx" ON "people" USING btree ("owner_id","name");--> statement-breakpoint
CREATE INDEX "people_company_id_idx" ON "people" USING btree ("company_id");