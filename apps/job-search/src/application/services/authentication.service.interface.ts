import type { Session } from "@/src/entities/models/session.model";

export interface IAuthenticationService {
  // The signed-in session, or null when no one is signed in. A session that can't be read
  // throws instead: taken as signed out, it would get past the auth route's check, which
  // lets signed-out requests through to sign in.
  getSession(): Promise<Session | null>;
}
