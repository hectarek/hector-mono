import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { resolveActor } from "@/src/application/use-cases/access/resolve-actor";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";

export function createAccessModule() {
  const accessModule = createModule();

  // The two accounts that may use the app, pinned by user id per environment
  // (docs/build-plan.md KTD2). Tests pin the mock auth service's owner and agent.
  accessModule.bind(DI_SYMBOLS.AllowedUserIds).toValue(
    process.env.NODE_ENV === "test"
      ? {
          ownerUserId: TEST_ACCOUNTS.owner.user.id,
          agentUserId: TEST_ACCOUNTS.agent.user.id,
        }
      : {
          ownerUserId: process.env.OWNER_USER_ID,
          agentUserId: process.env.AGENT_USER_ID,
        },
  );

  accessModule
    .bind(DI_SYMBOLS.IResolveActor)
    .toHigherOrderFunction(resolveActor, [
      DI_SYMBOLS.IAuthenticationService,
      DI_SYMBOLS.AllowedUserIds,
      DI_SYMBOLS.ILoggerService,
    ]);

  return accessModule;
}
