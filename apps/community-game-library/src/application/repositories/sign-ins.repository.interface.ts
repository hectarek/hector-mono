import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { WayIn } from "@/src/entities/ways-in";

// An account's sign-in, in Neon Auth's own tables (the neon_auth schema, in the app's database).
// Deleting an account (E9) and the admin's removal (G8) anonymize it in their own transaction,
// rather than deleting it through Neon's API, which needs an API key (Hector, 2026-11-24).
export interface ISignInsRepository {
  // The email each account signs in with, for the admin's search (G8), in id order. An id with
  // no sign-in is left out, and no ids read nothing.
  listEmails(
    userIds: readonly string[],
  ): Promise<{ userId: string; email: string }[]>;
  // How an account signs in (E5), in WAYS_IN's order: Google, a password, or both. A provider the
  // app doesn't offer is left out.
  listWaysIn(userId: string): Promise<WayIn[]>;
  // Its name, email and picture become placeholders; its ways in (Google's link, the password),
  // its sessions and the codes still waiting for its email go. It can't be used again, and its
  // id stays for the history that names it.
  anonymize(userId: string, tx: ITransaction): Promise<void>;
}
