import { pgSchema, text, uuid } from "drizzle-orm/pg-core";

// Read-only view of Neon Auth's managed user table, used to show member names.
// Deliberately NOT in db/schema.ts: drizzle-kit must never generate migrations for the
// neon_auth schema, which Neon owns and may change.
export const neonAuthUsers = pgSchema("neon_auth").table("user", {
  id: uuid("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  image: text("image"),
});
