ALTER TABLE "settings" ADD COLUMN "season_start" date;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "season_finish" date;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "season_checkpoints" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_season_check" CHECK (("settings"."season_start" is null) = ("settings"."season_finish" is null) and ("settings"."season_finish" is null or "settings"."season_finish" > "settings"."season_start"));--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_season_checkpoints_check" CHECK (case when jsonb_typeof("settings"."season_checkpoints") = 'array' then jsonb_array_length("settings"."season_checkpoints") <= 3 else false end);