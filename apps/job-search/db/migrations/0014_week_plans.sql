CREATE TABLE "week_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"week" date NOT NULL,
	"milestone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "week_plans_week_check" CHECK (extract(isodow from "week_plans"."week") = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "week_plans_owner_id_week_idx" ON "week_plans" USING btree ("owner_id","week");