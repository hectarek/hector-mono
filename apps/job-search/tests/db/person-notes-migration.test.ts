import { beforeEach, describe, expect, it } from "bun:test";
import { OWNER } from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

// 0008 (the UX plan's UX8): each person's notes, one text until then, become their first dated
// note. The test database ran it while empty, so the test runs its SQL again over people as the
// code before it wrote them.
const MIGRATION = await Bun.file(
  `${import.meta.dir}/../../db/migrations/0008_person_notes.sql`,
).text();

const aPerson = async (name: string, notes: string | null) => {
  const [row] = await sql<{ id: string }>(
    "insert into people (owner_id, name, notes, created_at) values ($1, $2, $3, '2026-11-06T15:44:10.123456Z') returning id",
    [OWNER, name, notes],
  );
  if (!row) throw new Error("No person");
  return row.id;
};

const added = (id: string, actor: string) =>
  sql(
    "insert into activity (owner_id, actor, record_kind, record_id, action, changes) values ($1, $2, 'person', $3, 'created', '[]')",
    [OWNER, actor, id],
  );

describe("0008, a person's notes as their first note [postgres]", () => {
  beforeEach(resetDatabase);

  it("moves each person's text to a note signed by whoever added them, dated when they were", async () => {
    const imported = await aPerson("Pat Example", "Met at a meetup.");
    await added(imported, "import");
    const hectors = await aPerson("Sam Example", "A friend of a friend.");
    await added(hectors, "owner");
    // No log of who added them: the import's, as everyone was before the app.
    const unlogged = await aPerson("Lee Example", "From the sheet.");
    await aPerson("Blank Example", "   ");
    await aPerson("None Example", null);

    await sql(MIGRATION);

    const notes = await sql<{
      record_id: string;
      record_kind: string;
      author: string;
      body: string;
      created: string;
      updated: string;
    }>(
      "select record_id, record_kind, author, body, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS.US') as created, to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS.US') as updated from notes order by body",
    );
    expect(notes).toEqual([
      {
        record_id: hectors,
        record_kind: "person",
        author: "owner",
        body: "A friend of a friend.",
        created: "2026-11-06 15:44:10.123456",
        // An edit sends back a JS Date, to the millisecond.
        updated: "2026-11-06 15:44:10.123000",
      },
      {
        record_id: unlogged,
        record_kind: "person",
        author: "import",
        body: "From the sheet.",
        created: "2026-11-06 15:44:10.123456",
        updated: "2026-11-06 15:44:10.123000",
      },
      {
        record_id: imported,
        record_kind: "person",
        author: "import",
        body: "Met at a meetup.",
        created: "2026-11-06 15:44:10.123456",
        updated: "2026-11-06 15:44:10.123000",
      },
    ]);
  });
});
