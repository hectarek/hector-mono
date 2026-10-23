import { auth } from "@/lib/auth/server";
import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { Session } from "@/src/entities/models/session.model";

// The part of Neon Auth's server client this uses, so tests can pass a stand-in without a
// network. Neon answers a failed call with `error` rather than throwing.
export type NeonSessionReader = {
  getSession(): Promise<{
    data: {
      user: { id: string; name?: string | null; email?: string | null } | null;
    } | null;
    error: { status: number; code?: string } | null;
  }>;
};

export class NeonAuthService implements IAuthenticationService {
  private readonly logger: ILoggerService;

  constructor(
    logger: ILoggerService,
    private readonly client: NeonSessionReader = auth,
  ) {
    this.logger = logger.child({ layer: "service", op: "auth" });
  }

  // Unlike recipes' copy, a session Neon can't read throws instead of reading as signed out
  // (IAuthenticationService).
  async getSession(): Promise<Session | null> {
    const { data: session, error } = await this.client.getSession();
    if (error) {
      this.logger.error("Failed to get session", {
        status: error.status,
        code: error.code,
      });
      throw new Error(`Couldn't read the session (${error.status})`);
    }

    if (!session?.user) {
      this.logger.debug("No active session");
      return null;
    }

    this.logger.debug("Session resolved", { userId: session.user.id });
    return {
      user: {
        id: session.user.id,
        name: session.user.name ?? "",
        email: session.user.email ?? "",
      },
    };
  }
}
