import type { Session } from "@/src/entities/models/session.model";

export interface IAuthenticationService {
  getSession(): Promise<Session | null>;
  // Ends this device's session: its cookies go (U22, once an account is deleted).
  signOut(): Promise<void>;
  // Deletes an account's sign-in, its user with its sessions and its ways in (U22), whoever asks:
  // the member deleting their own account, or the admin removing one. Never throws: the app's
  // rows are gone by then, so a failure is logged for the admin to finish by hand.
  deleteUser(userId: string): Promise<void>;
}
