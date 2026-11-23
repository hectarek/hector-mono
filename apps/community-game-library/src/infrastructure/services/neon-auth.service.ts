import { auth } from "@/lib/auth/server";
import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { loggable } from "@/src/entities/errors/loggable";
import type { Session } from "@/src/entities/models/session.model";

export class NeonAuthService implements IAuthenticationService {
  private readonly logger: ILoggerService;

  // Neon's API, for deleting a sign-in (U22): a project-scoped API key, and the project and branch
  // whose Neon Auth holds the users. Without them a deleted account's sign-in stays, logged.
  private readonly neonApi = {
    key: process.env.NEON_API_KEY,
    projectId: process.env.NEON_PROJECT_ID,
    branchId: process.env.NEON_BRANCH_ID,
  };

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
      // By class and code, never the error's message, which can quote an email
      // (docs/build-plan.md KTD1).
      this.logger.error("Failed to get session", loggable(err));
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await auth.signOut();
      if (error) {
        this.logger.error("Failed to sign out", { status: error.status });
      }
    } catch (err) {
      this.logger.error("Failed to sign out", loggable(err));
    }
  }

  // Through Neon's Delete Auth User endpoint, which deletes the user with its sessions and its
  // accounts (checked on the test project, 2026-11-23). Better Auth's own delete-user is switched
  // off in Neon's managed setup (it answers 404), and its admin remove-user takes an admin's
  // session, so neither serves a member deleting their own account (U22).
  async deleteUser(userId: string): Promise<void> {
    const { key, projectId, branchId } = this.neonApi;
    if (!key || !projectId || !branchId) {
      this.logger.warn("Sign-in kept: Neon's API settings are missing", {
        userId,
      });
      return;
    }
    const path = [projectId, "branches", branchId, "auth", "users", userId]
      .map(encodeURIComponent)
      .join("/");
    try {
      const response = await fetch(
        `https://console.neon.tech/api/v2/projects/${path}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${key}` } },
      );
      if (!response.ok) {
        this.logger.error("Failed to delete the sign-in", {
          userId,
          status: response.status,
        });
        return;
      }
      this.logger.info("Sign-in deleted", { userId });
    } catch (err) {
      this.logger.error("Failed to delete the sign-in", {
        userId,
        ...loggable(err),
      });
    }
  }
}
