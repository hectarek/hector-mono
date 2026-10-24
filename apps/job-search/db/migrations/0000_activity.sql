CREATE TABLE "activity" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"tool" text,
	"record_kind" text NOT NULL,
	"record_id" uuid NOT NULL,
	"action" text NOT NULL,
	"changes" jsonb NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE INDEX "activity_owner_id_created_at_idx" ON "activity" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_owner_id_record_idx" ON "activity" USING btree ("owner_id","record_kind","record_id","created_at");