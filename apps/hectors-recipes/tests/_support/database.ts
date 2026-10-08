// An in-memory Postgres (PGlite) standing in for Neon. preload.ts points "@/db" at it,
// so the real repositories and transaction manager run against real SQL, with the
// app's own migrations, and never against the live database.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { STARTING_TAGS, TAG_CATEGORIES } from "@/src/entities/models/tag.model";

const client = new PGlite();
export const testDb = drizzle({ client, schema });

let migrated: Promise<void> | undefined;

function migrateOnce(): Promise<void> {
  migrated ??= (async () => {
    // Neon Auth owns this table in production; the app only reads it for member names. Its
    // columns as Neon has them (2026-10-08), so a query naming one, such as role, without its
    // table fails here as it would there.
    await client.exec(`
      create schema neon_auth;
      create table neon_auth."user" (
        id uuid primary key, name text, email text, "emailVerified" boolean, image text,
        "createdAt" timestamptz, "updatedAt" timestamptz, role text, banned boolean,
        "banReason" text, "banExpires" timestamptz
      );
    `);
    await migrate(testDb, {
      migrationsFolder: `${import.meta.dir}/../../db/migrations`,
    });
  })();
  return migrated;
}

// Call in beforeEach: migrates on first use, then empties every table. The tag catalog keeps
// the rows its migration adds (STARTING_TAGS) and loses any a test added.
export async function resetDatabase(): Promise<void> {
  await migrateOnce();
  await client.exec(`
    truncate spaces, space_members, space_invites, recipes, recipe_ingredients,
      recipe_steps, ingredients, plan_entries, grocery_items, user_settings, recipe_reads,
      neon_auth."user" cascade;
  `);
  await client.query("delete from tags where name <> all($1)", [
    TAG_CATEGORIES.flatMap((category) => STARTING_TAGS[category]),
  ]);
}

// A Neon Auth user, so member lists can show a name. Again for the same id renames them, as
// changing an account's name does.
export async function addAuthUser(
  id: string,
  name: string,
  email: string,
): Promise<void> {
  await client.query(
    `insert into neon_auth."user" (id, name, email) values ($1, $2, $3)
     on conflict (id) do update set name = excluded.name, email = excluded.email`,
    [id, name, email],
  );
}

export async function sql<T>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await client.query<T>(query, params)).rows;
}
