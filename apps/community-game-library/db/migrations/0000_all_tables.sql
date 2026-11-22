CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Added by hand: drizzle-kit writes no extensions, and search's trigram index on games.search_title needs this one (KTD10).
--> statement-breakpoint
CREATE TABLE "friend_links" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friend_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "friend_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friend_requests_status_check" CHECK ("friend_requests"."status" in ('waiting', 'declined'))
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"user_id" uuid NOT NULL,
	"friend_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_user_id_friend_user_id_pk" PRIMARY KEY("user_id","friend_user_id"),
	CONSTRAINT "friendships_two_people_check" CHECK ("friendships"."user_id" <> "friendships"."friend_user_id")
);
--> statement-breakpoint
CREATE TABLE "game_night_attendees" (
	"game_night_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"guest_count" integer DEFAULT 0 NOT NULL,
	"invited_by" uuid,
	"waitlisted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_night_attendees_game_night_id_user_id_pk" PRIMARY KEY("game_night_id","user_id"),
	CONSTRAINT "game_night_attendees_status_check" CHECK ("game_night_attendees"."status" in ('invited', 'going', 'maybe', 'cant-go', 'waitlisted')),
	CONSTRAINT "game_night_attendees_guest_count_check" CHECK ("game_night_attendees"."guest_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "game_night_games" (
	"game_night_id" uuid NOT NULL,
	"user_game_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_night_games_game_night_id_user_game_id_pk" PRIMARY KEY("game_night_id","user_game_id")
);
--> statement-breakpoint
CREATE TABLE "game_night_votes" (
	"game_night_id" uuid NOT NULL,
	"user_game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "game_night_votes_game_night_id_user_game_id_user_id_pk" PRIMARY KEY("game_night_id","user_game_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "game_nights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"place" text NOT NULL,
	"address" text,
	"host_note" text,
	"capacity" integer NOT NULL,
	"audience" text DEFAULT 'friends' NOT NULL,
	"attendees_can_invite" boolean DEFAULT false NOT NULL,
	"guests_allowed" boolean DEFAULT false NOT NULL,
	"link_token" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_nights_link_token_unique" UNIQUE("link_token"),
	CONSTRAINT "game_nights_audience_check" CHECK ("game_nights"."audience" in ('friends', 'invited')),
	CONSTRAINT "game_nights_capacity_check" CHECK ("game_nights"."capacity" > 0),
	CONSTRAINT "game_nights_ends_after_start_check" CHECK ("game_nights"."ends_at" is null or "game_nights"."ends_at" > "game_nights"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "game_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"year" integer,
	"publisher" text,
	"source_url" text,
	"image_url" text,
	"status" text DEFAULT 'waiting' NOT NULL,
	"decline_note" text,
	"game_id" uuid,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_suggestions_status_check" CHECK ("game_suggestions"."status" in ('waiting', 'added', 'already-here', 'declined'))
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'base-game' NOT NULL,
	"base_game_id" uuid,
	"title" text NOT NULL,
	"search_title" text NOT NULL,
	"year" integer,
	"publishers" text[],
	"designers" text[],
	"min_players" integer,
	"max_players" integer,
	"best_players" integer[],
	"min_minutes" integer,
	"max_minutes" integer,
	"min_age" integer,
	"complexity" text,
	"categories" text[],
	"description" text,
	"image_url" text,
	"video_url" text,
	"popularity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_type_check" CHECK ("games"."type" in ('base-game', 'expansion')),
	CONSTRAINT "games_complexity_check" CHECK ("games"."complexity" in ('light', 'medium', 'heavy')),
	CONSTRAINT "games_base_game_check" CHECK (("games"."type" = 'expansion') = ("games"."base_game_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_game_id" uuid NOT NULL,
	"borrower_user_id" uuid NOT NULL,
	"previous_loan_id" uuid,
	"status" text DEFAULT 'requested' NOT NULL,
	"request_note" text,
	"period_days" integer,
	"due_on" date,
	"picked_up_on" date,
	"returned_on" date,
	"more_time_due_on" date,
	"more_time_note" text,
	"more_time_asked_at" timestamp with time zone,
	"called_back_at" timestamp with time zone,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loans_status_check" CHECK ("loans"."status" in ('requested', 'accepted', 'out', 'returning', 'passing', 'returned', 'passed-along', 'declined', 'withdrawn', 'cancelled')),
	CONSTRAINT "loans_picked_up_check" CHECK ("loans"."status" not in ('out', 'returning', 'passing', 'returned', 'passed-along') or ("loans"."picked_up_on" is not null and "loans"."due_on" is not null))
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"created_by" uuid,
	"loan_id" uuid,
	"game_night_id" uuid,
	"game_suggestion_id" uuid,
	"friend_request_id" uuid,
	"answer_note" text,
	"reminded_on" date,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notices_type_check" CHECK ("notices"."type" in ('loan-requested', 'line-joined', 'request-withdrawn', 'request-accepted', 'request-declined', 'turn-in-line', 'loan-cancelled', 'loan-recorded', 'return-to-confirm', 'return-not-confirmed', 'return-closed', 'pass-along-to-confirm', 'pass-along-taken-back', 'passed-along', 'more-time-asked', 'more-time-answered', 'due-date-changed', 'called-back', 'due-soon', 'due-today', 'due-back-today', 'overdue', 'friend-request', 'night-invite', 'night-changed', 'night-cancelled', 'waitlist-seat', 'removed-from-waitlist', 'night-today', 'suggestion-answered', 'suggestion-arrived'))
);
--> statement-breakpoint
CREATE TABLE "removed_users" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"removed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_game_expansions" (
	"user_game_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	CONSTRAINT "user_game_expansions_user_game_id_game_id_pk" PRIMARY KEY("user_game_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "user_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"condition" text DEFAULT 'good' NOT NULL,
	"condition_note" text,
	"lendable" boolean DEFAULT true NOT NULL,
	"pass_along" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_games_condition_check" CHECK ("user_games"."condition" in ('like-new', 'good', 'worn'))
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"piece_shape" text NOT NULL,
	"piece_color" text NOT NULL,
	"phone" text,
	"photo_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_piece_shape_check" CHECK ("user_profiles"."piece_shape" in ('pawn', 'cone', 'house', 'ship')),
	CONSTRAINT "user_profiles_piece_color_check" CHECK ("user_profiles"."piece_color" in ('brick', 'pumpkin', 'mustard', 'moss', 'teal', 'ocean', 'plum', 'rose', 'charcoal', 'bone'))
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"default_pass_along" boolean DEFAULT false NOT NULL,
	"notices_off" text[] DEFAULT array['night-mornings']::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_notices_off_check" CHECK ("user_settings"."notices_off" <@ array['due-date-reminders', 'overdue-reminders', 'requests-on-my-games', 'answers-to-my-requests', 'line-updates', 'pick-ups-and-returns', 'more-time-requests', 'friend-requests', 'night-invites', 'night-changes', 'waitlist-seats', 'night-mornings', 'suggestion-answers']::text[])
);
--> statement-breakpoint
ALTER TABLE "game_night_attendees" ADD CONSTRAINT "game_night_attendees_game_night_id_game_nights_id_fk" FOREIGN KEY ("game_night_id") REFERENCES "public"."game_nights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_night_games" ADD CONSTRAINT "game_night_games_game_night_id_game_nights_id_fk" FOREIGN KEY ("game_night_id") REFERENCES "public"."game_nights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_night_games" ADD CONSTRAINT "game_night_games_user_game_id_user_games_id_fk" FOREIGN KEY ("user_game_id") REFERENCES "public"."user_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_night_votes" ADD CONSTRAINT "game_night_votes_game_fk" FOREIGN KEY ("game_night_id","user_game_id") REFERENCES "public"."game_night_games"("game_night_id","user_game_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_suggestions" ADD CONSTRAINT "game_suggestions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_base_game_id_games_id_fk" FOREIGN KEY ("base_game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_game_id_user_games_id_fk" FOREIGN KEY ("user_game_id") REFERENCES "public"."user_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_previous_loan_id_loans_id_fk" FOREIGN KEY ("previous_loan_id") REFERENCES "public"."loans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_game_night_id_game_nights_id_fk" FOREIGN KEY ("game_night_id") REFERENCES "public"."game_nights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_game_suggestion_id_game_suggestions_id_fk" FOREIGN KEY ("game_suggestion_id") REFERENCES "public"."game_suggestions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_friend_request_id_friend_requests_id_fk" FOREIGN KEY ("friend_request_id") REFERENCES "public"."friend_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_game_expansions" ADD CONSTRAINT "user_game_expansions_user_game_id_user_games_id_fk" FOREIGN KEY ("user_game_id") REFERENCES "public"."user_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_game_expansions" ADD CONSTRAINT "user_game_expansions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "friend_requests_one_per_pair_idx" ON "friend_requests" USING btree (least("created_by", "recipient_user_id"),greatest("created_by", "recipient_user_id"));--> statement-breakpoint
CREATE INDEX "game_night_attendees_user_idx" ON "game_night_attendees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "game_nights_starts_at_idx" ON "game_nights" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "games_search_title_idx" ON "games" USING gin ("search_title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "loans_user_game_status_idx" ON "loans" USING btree ("user_game_id","status");--> statement-breakpoint
CREATE INDEX "loans_borrower_status_idx" ON "loans" USING btree ("borrower_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "loans_one_holder_idx" ON "loans" USING btree ("user_game_id") WHERE "loans"."status" in ('out', 'returning', 'passing');--> statement-breakpoint
CREATE UNIQUE INDEX "loans_one_promised_idx" ON "loans" USING btree ("user_game_id") WHERE "loans"."status" = 'accepted';--> statement-breakpoint
CREATE UNIQUE INDEX "loans_one_open_per_borrower_idx" ON "loans" USING btree ("user_game_id","borrower_user_id") WHERE "loans"."status" in ('requested', 'accepted', 'out', 'returning', 'passing');--> statement-breakpoint
CREATE INDEX "notices_user_created_idx" ON "notices" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notices_one_reminder_a_day_idx" ON "notices" USING btree ("user_id","type",coalesce("loan_id", "game_night_id"),"reminded_on") WHERE "notices"."reminded_on" is not null;--> statement-breakpoint
CREATE INDEX "user_games_user_idx" ON "user_games" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_games_game_idx" ON "user_games" USING btree ("game_id");