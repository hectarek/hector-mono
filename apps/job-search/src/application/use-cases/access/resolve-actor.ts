import { z } from "zod";
import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import {
  NotAllowedError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";

// The Neon Auth user ids of the app's two accounts, as the environment gives them
// (OWNER_USER_ID and AGENT_USER_ID, read by di/modules/access.module.ts).
export type AllowedUserIds = { ownerUserId?: string; agentUserId?: string };

const allowedUserIdsSchema = z.object({
  ownerUserId: z.uuid(),
  agentUserId: z.uuid(),
});

export type IResolveActor = ReturnType<typeof resolveActor>;

// Who the signed-in session acts as (docs/build-plan.md KTD2). Throws UnauthenticatedError
// for no session and NotAllowedError for any account but the two. It goes by user id, never
// email: whoever registered an allowed email first would otherwise get its identity. With
// an id missing or malformed, no one gets in, and the first session refused for it is
// logged, once: not when this is set up, which `next build` does without the ids.
export const resolveActor = (
  authenticationService: IAuthenticationService,
  allowedUserIds: AllowedUserIds,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "resolveActor" });
  const allowed = allowedUserIdsSchema.safeParse(allowedUserIds);
  let misconfigurationLogged = false;

  return async (): Promise<CurrentActor> => {
    const session = await authenticationService.getSession();
    if (!session) {
      throw new UnauthenticatedError("Sign in to use the app");
    }
    if (!allowed.success) {
      if (!misconfigurationLogged) {
        misconfigurationLogged = true;
        logger.error(
          "The owner's or agent's user id is missing or malformed: every session is refused",
          {
            invalid: allowed.error.issues.map((issue) => issue.path.join(".")),
          },
        );
      }
      throw new NotAllowedError();
    }
    const { ownerUserId, agentUserId } = allowed.data;
    if (session.user.id === ownerUserId) {
      return { actor: "owner", ownerId: ownerUserId };
    }
    if (session.user.id === agentUserId) {
      return { actor: "agent", ownerId: ownerUserId };
    }
    throw new NotAllowedError();
  };
};
