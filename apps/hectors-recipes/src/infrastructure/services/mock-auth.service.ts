import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { Session } from "@/src/entities/models/session.model";

export class MockAuthService implements IAuthenticationService {
  async getSession(): Promise<Session | null> {
    return {
      user: {
        id: "test-user-id",
        name: "Test User",
        email: "test@example.com",
      },
    };
  }
}
