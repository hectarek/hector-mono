-- "meal prep" joins the catalog under meal (ux-plan D78; STARTING_TAGS in src/entities/models/tag.model.ts).
-- Someone may have given it a group already, and groups are shared, so theirs stays.
INSERT INTO "tags" ("name", "category") VALUES ('meal prep', 'meal')
ON CONFLICT ("name") DO NOTHING;
