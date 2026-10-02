import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { acceptInviteUseCase } from "@/src/application/use-cases/spaces/accept-invite.use-case";
import { createInviteUseCase } from "@/src/application/use-cases/spaces/create-invite.use-case";
import { createSpaceUseCase } from "@/src/application/use-cases/spaces/create-space.use-case";
import { deleteSpaceUseCase } from "@/src/application/use-cases/spaces/delete-space.use-case";
import { ensureInviteLinksUseCase } from "@/src/application/use-cases/spaces/ensure-invite-links.use-case";
import { ensurePersonalSpaceUseCase } from "@/src/application/use-cases/spaces/ensure-personal-space.use-case";
import { getSpaceSettingsUseCase } from "@/src/application/use-cases/spaces/get-space-settings.use-case";
import { listMySpacesUseCase } from "@/src/application/use-cases/spaces/list-my-spaces.use-case";
import { previewInviteUseCase } from "@/src/application/use-cases/spaces/preview-invite.use-case";
import { removeMemberUseCase } from "@/src/application/use-cases/spaces/remove-member.use-case";
import { renameSpaceUseCase } from "@/src/application/use-cases/spaces/rename-space.use-case";
import { revokeInviteUseCase } from "@/src/application/use-cases/spaces/revoke-invite.use-case";
import { setDefaultSpaceUseCase } from "@/src/application/use-cases/spaces/set-default-space.use-case";
import { updateMemberRoleUseCase } from "@/src/application/use-cases/spaces/update-member-role.use-case";
import { SpacesRepository } from "@/src/infrastructure/repositories/spaces.repository";
import { MockSpacesRepository } from "@/src/infrastructure/repositories/spaces.repository.mock";
import { acceptInviteController } from "@/src/interface-adapters/controllers/spaces/accept-invite.controller";
import { createInviteController } from "@/src/interface-adapters/controllers/spaces/create-invite.controller";
import { createSpaceController } from "@/src/interface-adapters/controllers/spaces/create-space.controller";
import { deleteSpaceController } from "@/src/interface-adapters/controllers/spaces/delete-space.controller";
import { ensureInviteLinksController } from "@/src/interface-adapters/controllers/spaces/ensure-invite-links.controller";
import { ensurePersonalSpaceController } from "@/src/interface-adapters/controllers/spaces/ensure-personal-space.controller";
import { getSpaceSettingsController } from "@/src/interface-adapters/controllers/spaces/get-space-settings.controller";
import { listMySpacesController } from "@/src/interface-adapters/controllers/spaces/list-my-spaces.controller";
import { previewInviteController } from "@/src/interface-adapters/controllers/spaces/preview-invite.controller";
import { removeMemberController } from "@/src/interface-adapters/controllers/spaces/remove-member.controller";
import { renameSpaceController } from "@/src/interface-adapters/controllers/spaces/rename-space.controller";
import { revokeInviteController } from "@/src/interface-adapters/controllers/spaces/revoke-invite.controller";
import { setDefaultSpaceController } from "@/src/interface-adapters/controllers/spaces/set-default-space.controller";
import { updateMemberRoleController } from "@/src/interface-adapters/controllers/spaces/update-member-role.controller";

export function createSpacesModule() {
  const spacesModule = createModule();

  if (process.env.NODE_ENV === "test") {
    spacesModule
      .bind(DI_SYMBOLS.ISpacesRepository)
      .toClass(MockSpacesRepository);
  } else {
    spacesModule
      .bind(DI_SYMBOLS.ISpacesRepository)
      .toClass(SpacesRepository, [DI_SYMBOLS.ILoggerService]);
  }

  spacesModule
    .bind(DI_SYMBOLS.IEnsurePersonalSpaceUseCase)
    .toHigherOrderFunction(ensurePersonalSpaceUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.IEnsurePersonalSpaceController)
    .toHigherOrderFunction(ensurePersonalSpaceController, [
      DI_SYMBOLS.IEnsurePersonalSpaceUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.IListMySpacesUseCase)
    .toHigherOrderFunction(listMySpacesUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.IListMySpacesController)
    .toHigherOrderFunction(listMySpacesController, [
      DI_SYMBOLS.IListMySpacesUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.ICreateSpaceUseCase)
    .toHigherOrderFunction(createSpaceUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.ICreateSpaceController)
    .toHigherOrderFunction(createSpaceController, [
      DI_SYMBOLS.ICreateSpaceUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.IGetSpaceSettingsUseCase)
    .toHigherOrderFunction(getSpaceSettingsUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.IGetSpaceSettingsController)
    .toHigherOrderFunction(getSpaceSettingsController, [
      DI_SYMBOLS.IGetSpaceSettingsUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.IRenameSpaceUseCase)
    .toHigherOrderFunction(renameSpaceUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.IRenameSpaceController)
    .toHigherOrderFunction(renameSpaceController, [
      DI_SYMBOLS.IRenameSpaceUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.ISetDefaultSpaceUseCase)
    .toHigherOrderFunction(setDefaultSpaceUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.ISetDefaultSpaceController)
    .toHigherOrderFunction(setDefaultSpaceController, [
      DI_SYMBOLS.ISetDefaultSpaceUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.IDeleteSpaceUseCase)
    .toHigherOrderFunction(deleteSpaceUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.IDeleteSpaceController)
    .toHigherOrderFunction(deleteSpaceController, [
      DI_SYMBOLS.IDeleteSpaceUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.ICreateInviteUseCase)
    .toHigherOrderFunction(createInviteUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.ICreateInviteController)
    .toHigherOrderFunction(createInviteController, [
      DI_SYMBOLS.ICreateInviteUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.IRevokeInviteUseCase)
    .toHigherOrderFunction(revokeInviteUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.IRevokeInviteController)
    .toHigherOrderFunction(revokeInviteController, [
      DI_SYMBOLS.IRevokeInviteUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.IEnsureInviteLinksUseCase)
    .toHigherOrderFunction(ensureInviteLinksUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.IEnsureInviteLinksController)
    .toHigherOrderFunction(ensureInviteLinksController, [
      DI_SYMBOLS.IEnsureInviteLinksUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.IPreviewInviteUseCase)
    .toHigherOrderFunction(previewInviteUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.IPlanEntriesRepository,
      DI_SYMBOLS.IGroceryItemsRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.IPreviewInviteController)
    .toHigherOrderFunction(previewInviteController, [
      DI_SYMBOLS.IPreviewInviteUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.IAcceptInviteUseCase)
    .toHigherOrderFunction(acceptInviteUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.IPlanEntriesRepository,
      DI_SYMBOLS.IGroceryItemsRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.IAcceptInviteController)
    .toHigherOrderFunction(acceptInviteController, [
      DI_SYMBOLS.IAcceptInviteUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.IUpdateMemberRoleUseCase)
    .toHigherOrderFunction(updateMemberRoleUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.IUpdateMemberRoleController)
    .toHigherOrderFunction(updateMemberRoleController, [
      DI_SYMBOLS.IUpdateMemberRoleUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  spacesModule
    .bind(DI_SYMBOLS.IRemoveMemberUseCase)
    .toHigherOrderFunction(removeMemberUseCase, [
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  spacesModule
    .bind(DI_SYMBOLS.IRemoveMemberController)
    .toHigherOrderFunction(removeMemberController, [
      DI_SYMBOLS.IRemoveMemberUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return spacesModule;
}
