import type { Session } from "@/src/entities/models/session.model";

export interface IAuthenticationService {
  getSession(): Promise<Session | null>;
}
