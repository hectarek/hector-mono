-- The review queue retires (R20 as revised 2026-11-10, U19). A pending proposal joins Hector's
-- ranked list as an accepted job, and a dismissed one is archived as skipped, keeping its posting
-- key, so its posting can't come back. Each change is logged as the app logs one, by the system:
-- a history row, and for an archive a dated status move. It touches only rows still pending or
-- dismissed, so running it again changes nothing; the later migration that drops review_state
-- runs it first, for a proposal decided in between.
WITH "pending" AS (
	SELECT "id", "owner_id" FROM "jobs" WHERE "review_state" = 'pending'
), "accepted" AS (
	UPDATE "jobs" j
	SET "review_state" = 'accepted',
		"updated_at" = greatest(date_trunc('milliseconds', now()), j."updated_at" + interval '1 millisecond')
	FROM "pending" p
	WHERE j."id" = p."id"
	RETURNING j."id"
)
INSERT INTO "activity" ("owner_id", "actor", "record_kind", "record_id", "action", "changes", "reason")
SELECT
	p."owner_id",
	'system',
	'job',
	p."id",
	'updated',
	jsonb_build_array(jsonb_build_object('field', 'reviewState', 'before', 'pending', 'after', 'accepted')),
	'The review queue retired, so the job joined the ranked list'
FROM "pending" p;
--> statement-breakpoint
WITH "dismissed" AS (
	SELECT "id", "owner_id", "status", "next_step", "next_date", "dismiss_reason", "dismiss_note"
	FROM "jobs"
	WHERE "review_state" = 'dismissed'
), "archived" AS (
	UPDATE "jobs" j
	SET "review_state" = 'accepted',
		"status" = 'skipped',
		"next_step" = NULL,
		"next_date" = NULL,
		"updated_at" = greatest(date_trunc('milliseconds', now()), j."updated_at" + interval '1 millisecond')
	FROM "dismissed" d
	WHERE j."id" = d."id"
	RETURNING j."id"
), "moves" AS (
	INSERT INTO "job_status_changes" ("owner_id", "job_id", "from_status", "to_status", "occurred_on", "actor")
	SELECT d."owner_id", d."id", d."status", 'skipped', (now() AT TIME ZONE 'America/New_York')::date, 'system'
	FROM "dismissed" d
	WHERE d."status" <> 'skipped'
)
INSERT INTO "activity" ("owner_id", "actor", "record_kind", "record_id", "action", "changes", "reason")
SELECT
	d."owner_id",
	'system',
	'job',
	d."id",
	'updated',
	jsonb_build_array(jsonb_build_object('field', 'status', 'before', d."status", 'after', 'skipped'))
		|| CASE WHEN d."next_step" IS NULL THEN '[]'::jsonb
			ELSE jsonb_build_array(jsonb_build_object('field', 'nextStep', 'before', d."next_step", 'after', NULL)) END
		|| CASE WHEN d."next_date" IS NULL THEN '[]'::jsonb
			ELSE jsonb_build_array(jsonb_build_object('field', 'nextDate', 'before', d."next_date", 'after', NULL)) END,
	'Dismissed in the review queue'
		|| coalesce(' (' || d."dismiss_reason" || ')', '')
		|| coalesce(': ' || d."dismiss_note", '')
FROM "dismissed" d;
