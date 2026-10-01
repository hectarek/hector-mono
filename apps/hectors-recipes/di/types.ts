import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { IRecipeReadsRepository } from "@/src/application/repositories/recipe-reads.repository.interface";
import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import type { IRecipePageFetcherService } from "@/src/application/services/recipe-page-fetcher.service.interface";
import type { IRecipeReaderService } from "@/src/application/services/recipe-reader.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type { IAddGroceryItemUseCase } from "@/src/application/use-cases/grocery/add-grocery-item.use-case";
import type { IAddPlanToListUseCase } from "@/src/application/use-cases/grocery/add-plan-to-list.use-case";
import type { IAddRecipesToListUseCase } from "@/src/application/use-cases/grocery/add-recipes-to-list.use-case";
import type { IClearCheckedItemsUseCase } from "@/src/application/use-cases/grocery/clear-checked-items.use-case";
import type { IGetGroceryListUseCase } from "@/src/application/use-cases/grocery/get-grocery-list.use-case";
import type { IListMealsToAddUseCase } from "@/src/application/use-cases/grocery/list-meals-to-add.use-case";
import type { IRemoveGroceryItemUseCase } from "@/src/application/use-cases/grocery/remove-grocery-item.use-case";
import type { ISetGroceryItemCheckedUseCase } from "@/src/application/use-cases/grocery/set-grocery-item-checked.use-case";
import type { IUpdateGroceryItemUseCase } from "@/src/application/use-cases/grocery/update-grocery-item.use-case";
import type { IAddPlanEntryUseCase } from "@/src/application/use-cases/plan/add-plan-entry.use-case";
import type { IChangeEntryDaysUseCase } from "@/src/application/use-cases/plan/change-entry-days.use-case";
import type { IGetWeekPlanUseCase } from "@/src/application/use-cases/plan/get-week-plan.use-case";
import type { IRemovePlanEntryUseCase } from "@/src/application/use-cases/plan/remove-plan-entry.use-case";
import type { ISetEntryCookedUseCase } from "@/src/application/use-cases/plan/set-entry-cooked.use-case";
import type { IGrantPlanSubscriptionUseCase } from "@/src/application/use-cases/realtime/grant-plan-subscription.use-case";
import type { IAdoptRecipesUseCase } from "@/src/application/use-cases/recipes/adopt-recipes.use-case";
import type { ICreateRecipeUseCase } from "@/src/application/use-cases/recipes/create-recipe.use-case";
import type { IDeleteRecipeUseCase } from "@/src/application/use-cases/recipes/delete-recipe.use-case";
import type { IGetAllRecipesUseCase } from "@/src/application/use-cases/recipes/get-all-recipes.use-case";
import type { IGetRecipeUseCase } from "@/src/application/use-cases/recipes/get-recipe.use-case";
import type { IGetRecipesUseCase } from "@/src/application/use-cases/recipes/get-recipes.use-case";
import type { IReadRecipeUseCase } from "@/src/application/use-cases/recipes/read-recipe.use-case";
import type { IReadRecipeFromLinkUseCase } from "@/src/application/use-cases/recipes/read-recipe-from-link.use-case";
import type { IUpdateRecipeUseCase } from "@/src/application/use-cases/recipes/update-recipe.use-case";
import type { IAcceptInviteUseCase } from "@/src/application/use-cases/spaces/accept-invite.use-case";
import type { ICreateInviteUseCase } from "@/src/application/use-cases/spaces/create-invite.use-case";
import type { ICreateSpaceUseCase } from "@/src/application/use-cases/spaces/create-space.use-case";
import type { IDeleteSpaceUseCase } from "@/src/application/use-cases/spaces/delete-space.use-case";
import type { IEnsureInviteLinksUseCase } from "@/src/application/use-cases/spaces/ensure-invite-links.use-case";
import type { IEnsurePersonalSpaceUseCase } from "@/src/application/use-cases/spaces/ensure-personal-space.use-case";
import type { IGetSpaceSettingsUseCase } from "@/src/application/use-cases/spaces/get-space-settings.use-case";
import type { IListMySpacesUseCase } from "@/src/application/use-cases/spaces/list-my-spaces.use-case";
import type { IPreviewInviteUseCase } from "@/src/application/use-cases/spaces/preview-invite.use-case";
import type { IRemoveMemberUseCase } from "@/src/application/use-cases/spaces/remove-member.use-case";
import type { IRenameSpaceUseCase } from "@/src/application/use-cases/spaces/rename-space.use-case";
import type { IRevokeInviteUseCase } from "@/src/application/use-cases/spaces/revoke-invite.use-case";
import type { ISetDefaultSpaceUseCase } from "@/src/application/use-cases/spaces/set-default-space.use-case";
import type { IUpdateMemberRoleUseCase } from "@/src/application/use-cases/spaces/update-member-role.use-case";
import type { IAddGroceryItemController } from "@/src/interface-adapters/controllers/grocery/add-grocery-item.controller";
import type { IAddPlanToListController } from "@/src/interface-adapters/controllers/grocery/add-plan-to-list.controller";
import type { IAddRecipesToListController } from "@/src/interface-adapters/controllers/grocery/add-recipes-to-list.controller";
import type { IClearCheckedItemsController } from "@/src/interface-adapters/controllers/grocery/clear-checked-items.controller";
import type { IGetGroceryListController } from "@/src/interface-adapters/controllers/grocery/get-grocery-list.controller";
import type { IListMealsToAddController } from "@/src/interface-adapters/controllers/grocery/list-meals-to-add.controller";
import type { IRemoveGroceryItemController } from "@/src/interface-adapters/controllers/grocery/remove-grocery-item.controller";
import type { ISetGroceryItemCheckedController } from "@/src/interface-adapters/controllers/grocery/set-grocery-item-checked.controller";
import type { IUpdateGroceryItemController } from "@/src/interface-adapters/controllers/grocery/update-grocery-item.controller";
import type { IAddPlanEntryController } from "@/src/interface-adapters/controllers/plan/add-plan-entry.controller";
import type { IChangeEntryDaysController } from "@/src/interface-adapters/controllers/plan/change-entry-days.controller";
import type { IGetWeekPlanController } from "@/src/interface-adapters/controllers/plan/get-week-plan.controller";
import type { IRemovePlanEntryController } from "@/src/interface-adapters/controllers/plan/remove-plan-entry.controller";
import type { ISetEntryCookedController } from "@/src/interface-adapters/controllers/plan/set-entry-cooked.controller";
import type { IGrantPlanSubscriptionController } from "@/src/interface-adapters/controllers/realtime/grant-plan-subscription.controller";
import type { IAdoptRecipesController } from "@/src/interface-adapters/controllers/recipes/adopt-recipes.controller";
import type { ICreateRecipeController } from "@/src/interface-adapters/controllers/recipes/create-recipe.controller";
import type { IDeleteRecipeController } from "@/src/interface-adapters/controllers/recipes/delete-recipe.controller";
import type { IGetAllRecipesController } from "@/src/interface-adapters/controllers/recipes/get-all-recipes.controller";
import type { IGetRecipeController } from "@/src/interface-adapters/controllers/recipes/get-recipe.controller";
import type { IGetRecipesController } from "@/src/interface-adapters/controllers/recipes/get-recipes.controller";
import type { IReadRecipeController } from "@/src/interface-adapters/controllers/recipes/read-recipe.controller";
import type { IReadRecipeFromLinkController } from "@/src/interface-adapters/controllers/recipes/read-recipe-from-link.controller";
import type { IUpdateRecipeController } from "@/src/interface-adapters/controllers/recipes/update-recipe.controller";
import type { IAcceptInviteController } from "@/src/interface-adapters/controllers/spaces/accept-invite.controller";
import type { ICreateInviteController } from "@/src/interface-adapters/controllers/spaces/create-invite.controller";
import type { ICreateSpaceController } from "@/src/interface-adapters/controllers/spaces/create-space.controller";
import type { IDeleteSpaceController } from "@/src/interface-adapters/controllers/spaces/delete-space.controller";
import type { IEnsureInviteLinksController } from "@/src/interface-adapters/controllers/spaces/ensure-invite-links.controller";
import type { IEnsurePersonalSpaceController } from "@/src/interface-adapters/controllers/spaces/ensure-personal-space.controller";
import type { IGetSpaceSettingsController } from "@/src/interface-adapters/controllers/spaces/get-space-settings.controller";
import type { IListMySpacesController } from "@/src/interface-adapters/controllers/spaces/list-my-spaces.controller";
import type { IPreviewInviteController } from "@/src/interface-adapters/controllers/spaces/preview-invite.controller";
import type { IRemoveMemberController } from "@/src/interface-adapters/controllers/spaces/remove-member.controller";
import type { IRenameSpaceController } from "@/src/interface-adapters/controllers/spaces/rename-space.controller";
import type { IRevokeInviteController } from "@/src/interface-adapters/controllers/spaces/revoke-invite.controller";
import type { ISetDefaultSpaceController } from "@/src/interface-adapters/controllers/spaces/set-default-space.controller";
import type { IUpdateMemberRoleController } from "@/src/interface-adapters/controllers/spaces/update-member-role.controller";

export const DI_SYMBOLS = {
  IAuthenticationService: Symbol.for("IAuthenticationService"),
  ILoggerService: Symbol.for("ILoggerService"),
  IRealtimeService: Symbol.for("IRealtimeService"),
  IRecipeReaderService: Symbol.for("IRecipeReaderService"),
  IRecipeReadsRepository: Symbol.for("IRecipeReadsRepository"),
  IRecipePageFetcherService: Symbol.for("IRecipePageFetcherService"),
  IGrantPlanSubscriptionUseCase: Symbol.for("IGrantPlanSubscriptionUseCase"),
  IGrantPlanSubscriptionController: Symbol.for(
    "IGrantPlanSubscriptionController",
  ),
  ITransactionManagerService: Symbol.for("ITransactionManagerService"),

  ISpacesRepository: Symbol.for("ISpacesRepository"),
  IRecipesRepository: Symbol.for("IRecipesRepository"),
  IPlanEntriesRepository: Symbol.for("IPlanEntriesRepository"),
  IGroceryItemsRepository: Symbol.for("IGroceryItemsRepository"),

  IEnsurePersonalSpaceUseCase: Symbol.for("IEnsurePersonalSpaceUseCase"),
  ICreateRecipeUseCase: Symbol.for("ICreateRecipeUseCase"),
  IGetRecipesUseCase: Symbol.for("IGetRecipesUseCase"),
  IGetAllRecipesUseCase: Symbol.for("IGetAllRecipesUseCase"),
  IGetRecipeUseCase: Symbol.for("IGetRecipeUseCase"),
  IUpdateRecipeUseCase: Symbol.for("IUpdateRecipeUseCase"),
  IDeleteRecipeUseCase: Symbol.for("IDeleteRecipeUseCase"),
  IReadRecipeUseCase: Symbol.for("IReadRecipeUseCase"),
  IReadRecipeFromLinkUseCase: Symbol.for("IReadRecipeFromLinkUseCase"),
  IGetGroceryListUseCase: Symbol.for("IGetGroceryListUseCase"),
  IAddGroceryItemUseCase: Symbol.for("IAddGroceryItemUseCase"),
  ISetGroceryItemCheckedUseCase: Symbol.for("ISetGroceryItemCheckedUseCase"),
  IRemoveGroceryItemUseCase: Symbol.for("IRemoveGroceryItemUseCase"),
  IUpdateGroceryItemUseCase: Symbol.for("IUpdateGroceryItemUseCase"),
  IClearCheckedItemsUseCase: Symbol.for("IClearCheckedItemsUseCase"),
  IAddRecipesToListUseCase: Symbol.for("IAddRecipesToListUseCase"),
  IAddPlanToListUseCase: Symbol.for("IAddPlanToListUseCase"),
  IListMealsToAddUseCase: Symbol.for("IListMealsToAddUseCase"),
  IGetWeekPlanUseCase: Symbol.for("IGetWeekPlanUseCase"),
  IAddPlanEntryUseCase: Symbol.for("IAddPlanEntryUseCase"),
  ISetEntryCookedUseCase: Symbol.for("ISetEntryCookedUseCase"),
  IChangeEntryDaysUseCase: Symbol.for("IChangeEntryDaysUseCase"),
  IRemovePlanEntryUseCase: Symbol.for("IRemovePlanEntryUseCase"),
  IListMySpacesUseCase: Symbol.for("IListMySpacesUseCase"),
  ICreateSpaceUseCase: Symbol.for("ICreateSpaceUseCase"),
  IGetSpaceSettingsUseCase: Symbol.for("IGetSpaceSettingsUseCase"),
  IRenameSpaceUseCase: Symbol.for("IRenameSpaceUseCase"),
  IEnsureInviteLinksUseCase: Symbol.for("IEnsureInviteLinksUseCase"),
  ISetDefaultSpaceUseCase: Symbol.for("ISetDefaultSpaceUseCase"),
  IDeleteSpaceUseCase: Symbol.for("IDeleteSpaceUseCase"),
  ICreateInviteUseCase: Symbol.for("ICreateInviteUseCase"),
  IRevokeInviteUseCase: Symbol.for("IRevokeInviteUseCase"),
  IPreviewInviteUseCase: Symbol.for("IPreviewInviteUseCase"),
  IAcceptInviteUseCase: Symbol.for("IAcceptInviteUseCase"),
  IUpdateMemberRoleUseCase: Symbol.for("IUpdateMemberRoleUseCase"),
  IRemoveMemberUseCase: Symbol.for("IRemoveMemberUseCase"),
  IAdoptRecipesUseCase: Symbol.for("IAdoptRecipesUseCase"),

  IEnsurePersonalSpaceController: Symbol.for("IEnsurePersonalSpaceController"),
  ICreateRecipeController: Symbol.for("ICreateRecipeController"),
  IGetRecipesController: Symbol.for("IGetRecipesController"),
  IGetAllRecipesController: Symbol.for("IGetAllRecipesController"),
  IGetRecipeController: Symbol.for("IGetRecipeController"),
  IUpdateRecipeController: Symbol.for("IUpdateRecipeController"),
  IDeleteRecipeController: Symbol.for("IDeleteRecipeController"),
  IReadRecipeController: Symbol.for("IReadRecipeController"),
  IReadRecipeFromLinkController: Symbol.for("IReadRecipeFromLinkController"),
  IGetGroceryListController: Symbol.for("IGetGroceryListController"),
  IAddGroceryItemController: Symbol.for("IAddGroceryItemController"),
  ISetGroceryItemCheckedController: Symbol.for(
    "ISetGroceryItemCheckedController",
  ),
  IRemoveGroceryItemController: Symbol.for("IRemoveGroceryItemController"),
  IUpdateGroceryItemController: Symbol.for("IUpdateGroceryItemController"),
  IClearCheckedItemsController: Symbol.for("IClearCheckedItemsController"),
  IAddRecipesToListController: Symbol.for("IAddRecipesToListController"),
  IAddPlanToListController: Symbol.for("IAddPlanToListController"),
  IListMealsToAddController: Symbol.for("IListMealsToAddController"),
  IGetWeekPlanController: Symbol.for("IGetWeekPlanController"),
  IAddPlanEntryController: Symbol.for("IAddPlanEntryController"),
  ISetEntryCookedController: Symbol.for("ISetEntryCookedController"),
  IChangeEntryDaysController: Symbol.for("IChangeEntryDaysController"),
  IRemovePlanEntryController: Symbol.for("IRemovePlanEntryController"),
  IListMySpacesController: Symbol.for("IListMySpacesController"),
  ICreateSpaceController: Symbol.for("ICreateSpaceController"),
  IGetSpaceSettingsController: Symbol.for("IGetSpaceSettingsController"),
  IRenameSpaceController: Symbol.for("IRenameSpaceController"),
  IEnsureInviteLinksController: Symbol.for("IEnsureInviteLinksController"),
  ISetDefaultSpaceController: Symbol.for("ISetDefaultSpaceController"),
  IDeleteSpaceController: Symbol.for("IDeleteSpaceController"),
  ICreateInviteController: Symbol.for("ICreateInviteController"),
  IRevokeInviteController: Symbol.for("IRevokeInviteController"),
  IPreviewInviteController: Symbol.for("IPreviewInviteController"),
  IAcceptInviteController: Symbol.for("IAcceptInviteController"),
  IUpdateMemberRoleController: Symbol.for("IUpdateMemberRoleController"),
  IRemoveMemberController: Symbol.for("IRemoveMemberController"),
  IAdoptRecipesController: Symbol.for("IAdoptRecipesController"),
};

export interface DI_RETURN_TYPES {
  IAuthenticationService: IAuthenticationService;
  ILoggerService: ILoggerService;
  IRealtimeService: IRealtimeService;
  IRecipeReaderService: IRecipeReaderService;
  IRecipeReadsRepository: IRecipeReadsRepository;
  IRecipePageFetcherService: IRecipePageFetcherService;
  IGrantPlanSubscriptionUseCase: IGrantPlanSubscriptionUseCase;
  IGrantPlanSubscriptionController: IGrantPlanSubscriptionController;
  ITransactionManagerService: ITransactionManagerService;

  ISpacesRepository: ISpacesRepository;
  IRecipesRepository: IRecipesRepository;
  IPlanEntriesRepository: IPlanEntriesRepository;
  IGroceryItemsRepository: IGroceryItemsRepository;

  IEnsurePersonalSpaceUseCase: IEnsurePersonalSpaceUseCase;
  ICreateRecipeUseCase: ICreateRecipeUseCase;
  IGetRecipesUseCase: IGetRecipesUseCase;
  IGetAllRecipesUseCase: IGetAllRecipesUseCase;
  IGetRecipeUseCase: IGetRecipeUseCase;
  IUpdateRecipeUseCase: IUpdateRecipeUseCase;
  IDeleteRecipeUseCase: IDeleteRecipeUseCase;
  IReadRecipeUseCase: IReadRecipeUseCase;
  IReadRecipeFromLinkUseCase: IReadRecipeFromLinkUseCase;
  IGetGroceryListUseCase: IGetGroceryListUseCase;
  IAddGroceryItemUseCase: IAddGroceryItemUseCase;
  ISetGroceryItemCheckedUseCase: ISetGroceryItemCheckedUseCase;
  IRemoveGroceryItemUseCase: IRemoveGroceryItemUseCase;
  IUpdateGroceryItemUseCase: IUpdateGroceryItemUseCase;
  IClearCheckedItemsUseCase: IClearCheckedItemsUseCase;
  IAddRecipesToListUseCase: IAddRecipesToListUseCase;
  IAddPlanToListUseCase: IAddPlanToListUseCase;
  IListMealsToAddUseCase: IListMealsToAddUseCase;
  IGetWeekPlanUseCase: IGetWeekPlanUseCase;
  IAddPlanEntryUseCase: IAddPlanEntryUseCase;
  ISetEntryCookedUseCase: ISetEntryCookedUseCase;
  IChangeEntryDaysUseCase: IChangeEntryDaysUseCase;
  IRemovePlanEntryUseCase: IRemovePlanEntryUseCase;
  IListMySpacesUseCase: IListMySpacesUseCase;
  ICreateSpaceUseCase: ICreateSpaceUseCase;
  IGetSpaceSettingsUseCase: IGetSpaceSettingsUseCase;
  IRenameSpaceUseCase: IRenameSpaceUseCase;
  IEnsureInviteLinksUseCase: IEnsureInviteLinksUseCase;
  ISetDefaultSpaceUseCase: ISetDefaultSpaceUseCase;
  IDeleteSpaceUseCase: IDeleteSpaceUseCase;
  ICreateInviteUseCase: ICreateInviteUseCase;
  IRevokeInviteUseCase: IRevokeInviteUseCase;
  IPreviewInviteUseCase: IPreviewInviteUseCase;
  IAcceptInviteUseCase: IAcceptInviteUseCase;
  IUpdateMemberRoleUseCase: IUpdateMemberRoleUseCase;
  IRemoveMemberUseCase: IRemoveMemberUseCase;
  IAdoptRecipesUseCase: IAdoptRecipesUseCase;

  IEnsurePersonalSpaceController: IEnsurePersonalSpaceController;
  ICreateRecipeController: ICreateRecipeController;
  IGetRecipesController: IGetRecipesController;
  IGetAllRecipesController: IGetAllRecipesController;
  IGetRecipeController: IGetRecipeController;
  IUpdateRecipeController: IUpdateRecipeController;
  IDeleteRecipeController: IDeleteRecipeController;
  IReadRecipeController: IReadRecipeController;
  IReadRecipeFromLinkController: IReadRecipeFromLinkController;
  IGetGroceryListController: IGetGroceryListController;
  IAddGroceryItemController: IAddGroceryItemController;
  ISetGroceryItemCheckedController: ISetGroceryItemCheckedController;
  IRemoveGroceryItemController: IRemoveGroceryItemController;
  IUpdateGroceryItemController: IUpdateGroceryItemController;
  IClearCheckedItemsController: IClearCheckedItemsController;
  IAddRecipesToListController: IAddRecipesToListController;
  IAddPlanToListController: IAddPlanToListController;
  IListMealsToAddController: IListMealsToAddController;
  IGetWeekPlanController: IGetWeekPlanController;
  IAddPlanEntryController: IAddPlanEntryController;
  ISetEntryCookedController: ISetEntryCookedController;
  IChangeEntryDaysController: IChangeEntryDaysController;
  IRemovePlanEntryController: IRemovePlanEntryController;
  IListMySpacesController: IListMySpacesController;
  ICreateSpaceController: ICreateSpaceController;
  IGetSpaceSettingsController: IGetSpaceSettingsController;
  IRenameSpaceController: IRenameSpaceController;
  IEnsureInviteLinksController: IEnsureInviteLinksController;
  ISetDefaultSpaceController: ISetDefaultSpaceController;
  IDeleteSpaceController: IDeleteSpaceController;
  ICreateInviteController: ICreateInviteController;
  IRevokeInviteController: IRevokeInviteController;
  IPreviewInviteController: IPreviewInviteController;
  IAcceptInviteController: IAcceptInviteController;
  IUpdateMemberRoleController: IUpdateMemberRoleController;
  IRemoveMemberController: IRemoveMemberController;
  IAdoptRecipesController: IAdoptRecipesController;
}
