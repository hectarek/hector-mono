import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { Session } from "@/src/entities/models/session.model";

export class MockAuthService implements IAuthenticationService {
  // What the app asked of it, for tests to check: each sign-out, and each sign-in it deleted.
  signedOut = 0;
  readonly deletedUserIds: string[] = [];

  async getSession(): Promise<Session | null> {
    return {
      user: {
        id: "test-user-id",
        name: "Test User",
        email: "test@example.com",
      },
    };
  }

  async signOut(): Promise<void> {
    this.signedOut += 1;
  }

  async deleteUser(userId: string): Promise<void> {
    this.deletedUserIds.push(userId);
  }
}
