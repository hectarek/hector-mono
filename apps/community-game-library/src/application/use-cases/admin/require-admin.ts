import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { UnauthorizedError } from "@/src/entities/errors/common";

// The admin's Neon Auth user id, as the environment gives it (ADMIN_USER_ID, read by
// di/modules/access.module.ts). Production's is set after Hector's first sign-in there (H3).
export type AdminAccount = { adminUserId?: string };

export type IRequireAdmin = ReturnType<typeof requireAdmin>;

// The first step of anything only the admin does (docs/build-plan.md KTD1): the account whose
// id is ADMIN_USER_ID passes, and anyone else is refused with UnauthorizedError. It goes by
// user id, never email. With the id missing or malformed, nobody is the admin, and the first
// refusal it causes is logged, once: not when this is set up, which `next build` does without
// the id.
export const requireAdmin = (
  admin: AdminAccount,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "requireAdmin" });
  const adminUserId = z.uuid().safeParse(admin.adminUserId);
  let misconfigurationLogged = false;

  return (userId: string): void => {
    if (!adminUserId.success) {
      if (!misconfigurationLogged) {
        misconfigurationLogged = true;
        logger.warn(
          "ADMIN_USER_ID is missing or isn't a user id: nobody is the admin",
        );
      }
      throw new UnauthorizedError();
    }
    if (userId !== adminUserId.data) {
      throw new UnauthorizedError();
    }
  };
};
