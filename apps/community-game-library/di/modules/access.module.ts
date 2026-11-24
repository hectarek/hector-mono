import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { requireAdmin } from "@/src/application/use-cases/admin/require-admin";
import { RemovedUsersRepository } from "@/src/infrastructure/repositories/removed-users.repository";
import { MockRemovedUsersRepository } from "@/src/infrastructure/repositories/removed-users.repository.mock";
import { SignInsRepository } from "@/src/infrastructure/repositories/sign-ins.repository";
import { MockSignInsRepository } from "@/src/infrastructure/repositories/sign-ins.repository.mock";

export function createAccessModule() {
  const accessModule = createModule();

  // The one admin, pinned by user id per environment (docs/build-plan.md KTD1). Tests have none:
  // the preload drops ADMIN_USER_ID.
  accessModule
    .bind(DI_SYMBOLS.AdminAccount)
    .toValue({ adminUserId: process.env.ADMIN_USER_ID });

  accessModule
    .bind(DI_SYMBOLS.IRequireAdmin)
    .toHigherOrderFunction(requireAdmin, [
      DI_SYMBOLS.AdminAccount,
      DI_SYMBOLS.ILoggerService,
    ]);

  // The accounts the admin removed, which see only that (KTD3), and the sign-ins a deleted or
  // removed account leaves anonymized (U22, 2026-11-24).
  if (process.env.NODE_ENV === "test") {
    accessModule
      .bind(DI_SYMBOLS.IRemovedUsersRepository)
      .toClass(MockRemovedUsersRepository);
    accessModule
      .bind(DI_SYMBOLS.ISignInsRepository)
      .toClass(MockSignInsRepository);
  } else {
    accessModule
      .bind(DI_SYMBOLS.IRemovedUsersRepository)
      .toClass(RemovedUsersRepository, [DI_SYMBOLS.ILoggerService]);
    accessModule
      .bind(DI_SYMBOLS.ISignInsRepository)
      .toClass(SignInsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  return accessModule;
}
