import { auth } from "@/lib/auth/server";
import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { Session } from "@/src/entities/models/session.model";

export class NeonAuthService implements IAuthenticationService {
  private readonly logger: ILoggerService;

  constructor(logger: ILoggerService) {
    this.logger = logger.child({ layer: "service", op: "auth" });
  }

  async getSession(): Promise<Session | null> {
    try {
      const { data: session } = await auth.getSession();

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
    } catch (err) {
      this.logger.error("Failed to get session", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }
}
