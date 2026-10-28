CREATE TABLE "practice_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"session_id" uuid,
	"topic" text,
	"type" text,
	"pattern" text,
	"practiced_on" date NOT NULL,
	"result" text NOT NULL,
	"ai_used" boolean DEFAULT false NOT NULL,
	"minutes" integer,
	"notes" text,
	"author" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_entries_kind_check" CHECK ("practice_entries"."kind" in ('session', 'review')),
	CONSTRAINT "practice_entries_result_check" CHECK ("practice_entries"."result" in ('solved', 'partial', 'failed')),
	CONSTRAINT "practice_entries_session_check" CHECK (("practice_entries"."kind" = 'review') = ("practice_entries"."session_id" is not null)),
	CONSTRAINT "practice_entries_topic_check" CHECK (("practice_entries"."kind" = 'session') = ("practice_entries"."topic" is not null)),
	CONSTRAINT "practice_entries_minutes_check" CHECK ("practice_entries"."minutes" between 1 and 600)
);
--> statement-breakpoint
ALTER TABLE "practice_entries" ADD CONSTRAINT "practice_entries_session_id_practice_entries_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_entries_owner_id_practiced_on_idx" ON "practice_entries" USING btree ("owner_id","practiced_on");--> statement-breakpoint
CREATE INDEX "practice_entries_session_id_idx" ON "practice_entries" USING btree ("session_id");