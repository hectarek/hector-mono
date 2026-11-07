-- Each person's notes, one text until now, become their first dated note (the UX plan's UX8, Q7):
-- signed by whoever added the person, as the log's first `created` entry for them names it, and
-- dated when they were added, so later notes list above it. updated_at keeps milliseconds, as every
-- updated_at does, so an edit sent against it matches. people.notes stays, unread, until a later
-- migration drops it.
INSERT INTO "notes" ("owner_id", "record_kind", "record_id", "author", "body", "created_at", "updated_at")
SELECT
	p."owner_id",
	'person',
	p."id",
	coalesce(
		(
			SELECT a."actor"
			FROM "activity" a
			WHERE a."owner_id" = p."owner_id"
				AND a."record_kind" = 'person'
				AND a."record_id" = p."id"
				AND a."action" = 'created'
			ORDER BY a."id"
			LIMIT 1
		),
		'import'
	),
	p."notes",
	p."created_at",
	date_trunc('milliseconds', p."created_at")
FROM "people" p
WHERE p."notes" IS NOT NULL AND btrim(p."notes") <> '';
