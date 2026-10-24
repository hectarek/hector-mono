import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { Session } from "@/src/entities/models/session.model";

// The test container's accounts. di/modules/access.module.ts pins the first two as the
// app's owner and agent; the stranger is any other account. Fictional, like every fixture.
export const TEST_ACCOUNTS = {
  owner: {
    user: {
      id: "00000000-0000-4000-8000-0000000000a1",
      name: "Owner",
      email: "owner@example.com",
    },
  },
  agent: {
    user: {
      id: "00000000-0000-4000-8000-0000000000a2",
      name: "Agent",
      email: "agent@example.com",
    },
  },
  stranger: {
    user: {
      id: "00000000-0000-4000-8000-0000000000a3",
      name: "Stranger",
      email: "stranger@example.com",
    },
  },
} satisfies Record<string, Session>;

// Tests choose who's signed in through `session` (null: no one). It starts as the owner.
export class MockAuthService implements IAuthenticationService {
  session: Session | null = TEST_ACCOUNTS.owner;

  async getSession(): Promise<Session | null> {
    return this.session;
  }
}
