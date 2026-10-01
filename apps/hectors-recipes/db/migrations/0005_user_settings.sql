CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"default_plan_id" uuid,
	"default_book_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_default_plan_id_spaces_id_fk" FOREIGN KEY ("default_plan_id") REFERENCES "public"."spaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_default_book_id_spaces_id_fk" FOREIGN KEY ("default_book_id") REFERENCES "public"."spaces"("id") ON DELETE set null ON UPDATE no action;