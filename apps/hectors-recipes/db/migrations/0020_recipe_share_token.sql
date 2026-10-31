ALTER TABLE "recipes" ADD COLUMN "share_token" text;--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_share_token_unique_idx" ON "recipes" USING btree ("share_token");