CREATE TABLE "weekly_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"week" date NOT NULL,
	"counts" jsonb NOT NULL,
	"targets" jsonb NOT NULL,
	"milestone" text,
	"change" text,
	"author" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_reviews_owner_id_week_idx" ON "weekly_reviews" USING btree ("owner_id","week");