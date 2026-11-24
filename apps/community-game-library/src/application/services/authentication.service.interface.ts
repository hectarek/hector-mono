import type { Session } from "@/src/entities/models/session.model";

export interface IAuthenticationService {
  getSession(): Promise<Session | null>;
  // Ends this device's session: its cookies go (U22, once an account is deleted).
  signOut(): Promise<void>;
}
