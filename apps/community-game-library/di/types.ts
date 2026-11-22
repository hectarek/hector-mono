import type { IFriendLinksRepository } from "@/src/application/repositories/friend-links.repository.interface";
import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IRemovedUsersRepository } from "@/src/application/repositories/removed-users.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type {
  AdminAccount,
  IRequireAdmin,
} from "@/src/application/use-cases/admin/require-admin";
import type { IGetGameUseCase } from "@/src/application/use-cases/catalog/get-game.use-case";
import type { ISearchGamesUseCase } from "@/src/application/use-cases/catalog/search-games.use-case";
import type { IAddUserGameUseCase } from "@/src/application/use-cases/copies/add-user-game.use-case";
import type { IGetUserGameUseCase } from "@/src/application/use-cases/copies/get-user-game.use-case";
import type { IListLibraryUseCase } from "@/src/application/use-cases/copies/list-library.use-case";
import type { IListMyLibraryUseCase } from "@/src/application/use-cases/copies/list-my-library.use-case";
import type { IPutInBoxUseCase } from "@/src/application/use-cases/copies/put-in-box.use-case";
import type { IRemoveUserGameUseCase } from "@/src/application/use-cases/copies/remove-user-game.use-case";
import type { ISetLendingUseCase } from "@/src/application/use-cases/copies/set-lending.use-case";
import type { ISetPassAlongForAllUseCase } from "@/src/application/use-cases/copies/set-pass-along-for-all.use-case";
import type { IUpdateUserGameUseCase } from "@/src/application/use-cases/copies/update-user-game.use-case";
import type { IAnswerFriendRequestUseCase } from "@/src/application/use-cases/friends/answer-friend-request.use-case";
import type { ICancelFriendRequestUseCase } from "@/src/application/use-cases/friends/cancel-friend-request.use-case";
import type { ICheckFriendLinkUseCase } from "@/src/application/use-cases/friends/check-friend-link.use-case";
import type { IGetFriendUseCase } from "@/src/application/use-cases/friends/get-friend.use-case";
import type { IGetFriendLinkUseCase } from "@/src/application/use-cases/friends/get-friend-link.use-case";
import type { IListFriendsUseCase } from "@/src/application/use-cases/friends/list-friends.use-case";
import type { IListPeopleYouMayKnowUseCase } from "@/src/application/use-cases/friends/list-people-you-may-know.use-case";
import type { IMakeFriendLinkUseCase } from "@/src/application/use-cases/friends/make-friend-link.use-case";
import type { IOpenFriendLinkUseCase } from "@/src/application/use-cases/friends/open-friend-link.use-case";
import type { ISendFriendRequestUseCase } from "@/src/application/use-cases/friends/send-friend-request.use-case";
import type { IUnfriendUseCase } from "@/src/application/use-cases/friends/unfriend.use-case";
import type { IGetTabCountsUseCase } from "@/src/application/use-cases/notices/get-tab-counts.use-case";
import type { IListInboxUseCase } from "@/src/application/use-cases/notices/list-inbox.use-case";
import type { IMarkInboxReadUseCase } from "@/src/application/use-cases/notices/mark-inbox-read.use-case";
import type { ICreateProfileUseCase } from "@/src/application/use-cases/profile/create-profile.use-case";
import type { IGetAccountStateUseCase } from "@/src/application/use-cases/profile/get-account-state.use-case";
import type { IGetNoticeSettingsUseCase } from "@/src/application/use-cases/profile/get-notice-settings.use-case";
import type { IGetProfileUseCase } from "@/src/application/use-cases/profile/get-profile.use-case";
import type { IListTakenPiecesUseCase } from "@/src/application/use-cases/profile/list-taken-pieces.use-case";
import type { IRemovePhotoUseCase } from "@/src/application/use-cases/profile/remove-photo.use-case";
import type { ISetPhotoUseCase } from "@/src/application/use-cases/profile/set-photo.use-case";
import type { IUpdateNoticeSettingsUseCase } from "@/src/application/use-cases/profile/update-notice-settings.use-case";
import type { IUpdateProfileUseCase } from "@/src/application/use-cases/profile/update-profile.use-case";
import type { IAddGameUseCase } from "@/src/application/use-cases/suggestions/add-game.use-case";
import type { IAnswerSuggestionUseCase } from "@/src/application/use-cases/suggestions/answer-suggestion.use-case";
import type { IFindGamesToEditUseCase } from "@/src/application/use-cases/suggestions/find-games-to-edit.use-case";
import type { IGetGameToEditUseCase } from "@/src/application/use-cases/suggestions/get-game-to-edit.use-case";
import type { IGetSuggestionUseCase } from "@/src/application/use-cases/suggestions/get-suggestion.use-case";
import type { IListAnsweredSuggestionsUseCase } from "@/src/application/use-cases/suggestions/list-answered-suggestions.use-case";
import type { IListSuggestionsUseCase } from "@/src/application/use-cases/suggestions/list-suggestions.use-case";
import type { ISuggestGameUseCase } from "@/src/application/use-cases/suggestions/suggest-game.use-case";
import type { IUpdateGameUseCase } from "@/src/application/use-cases/suggestions/update-game.use-case";
import type { IGetGameController } from "@/src/interface-adapters/controllers/catalog/get-game.controller";
import type { ISearchGamesController } from "@/src/interface-adapters/controllers/catalog/search-games.controller";
import type { IAddUserGameController } from "@/src/interface-adapters/controllers/copies/add-user-game.controller";
import type { IGetUserGameController } from "@/src/interface-adapters/controllers/copies/get-user-game.controller";
import type { IListLibraryController } from "@/src/interface-adapters/controllers/copies/list-library.controller";
import type { IListMyLibraryController } from "@/src/interface-adapters/controllers/copies/list-my-library.controller";
import type { IPutInBoxController } from "@/src/interface-adapters/controllers/copies/put-in-box.controller";
import type { IRemoveUserGameController } from "@/src/interface-adapters/controllers/copies/remove-user-game.controller";
import type { ISetLendingController } from "@/src/interface-adapters/controllers/copies/set-lending.controller";
import type { ISetPassAlongForAllController } from "@/src/interface-adapters/controllers/copies/set-pass-along-for-all.controller";
import type { IUpdateUserGameController } from "@/src/interface-adapters/controllers/copies/update-user-game.controller";
import type { IAnswerFriendRequestController } from "@/src/interface-adapters/controllers/friends/answer-friend-request.controller";
import type { ICancelFriendRequestController } from "@/src/interface-adapters/controllers/friends/cancel-friend-request.controller";
import type { ICheckFriendLinkController } from "@/src/interface-adapters/controllers/friends/check-friend-link.controller";
import type { IGetFriendController } from "@/src/interface-adapters/controllers/friends/get-friend.controller";
import type { IGetFriendLinkController } from "@/src/interface-adapters/controllers/friends/get-friend-link.controller";
import type { IListFriendsController } from "@/src/interface-adapters/controllers/friends/list-friends.controller";
import type { IListPeopleYouMayKnowController } from "@/src/interface-adapters/controllers/friends/list-people-you-may-know.controller";
import type { IMakeFriendLinkController } from "@/src/interface-adapters/controllers/friends/make-friend-link.controller";
import type { IOpenFriendLinkController } from "@/src/interface-adapters/controllers/friends/open-friend-link.controller";
import type { ISendFriendRequestController } from "@/src/interface-adapters/controllers/friends/send-friend-request.controller";
import type { IUnfriendController } from "@/src/interface-adapters/controllers/friends/unfriend.controller";
import type { IGetTabCountsController } from "@/src/interface-adapters/controllers/notices/get-tab-counts.controller";
import type { IListInboxController } from "@/src/interface-adapters/controllers/notices/list-inbox.controller";
import type { IMarkInboxReadController } from "@/src/interface-adapters/controllers/notices/mark-inbox-read.controller";
import type { ICreateProfileController } from "@/src/interface-adapters/controllers/profile/create-profile.controller";
import type { IGetAccountStateController } from "@/src/interface-adapters/controllers/profile/get-account-state.controller";
import type { IGetNoticeSettingsController } from "@/src/interface-adapters/controllers/profile/get-notice-settings.controller";
import type { IGetProfileController } from "@/src/interface-adapters/controllers/profile/get-profile.controller";
import type { IListTakenPiecesController } from "@/src/interface-adapters/controllers/profile/list-taken-pieces.controller";
import type { IRemovePhotoController } from "@/src/interface-adapters/controllers/profile/remove-photo.controller";
import type { ISetPhotoController } from "@/src/interface-adapters/controllers/profile/set-photo.controller";
import type { IUpdateNoticeSettingsController } from "@/src/interface-adapters/controllers/profile/update-notice-settings.controller";
import type { IUpdateProfileController } from "@/src/interface-adapters/controllers/profile/update-profile.controller";
import type { IAddGameController } from "@/src/interface-adapters/controllers/suggestions/add-game.controller";
import type { IAnswerSuggestionController } from "@/src/interface-adapters/controllers/suggestions/answer-suggestion.controller";
import type { IFindGamesToEditController } from "@/src/interface-adapters/controllers/suggestions/find-games-to-edit.controller";
import type { IGetGameToEditController } from "@/src/interface-adapters/controllers/suggestions/get-game-to-edit.controller";
import type { IGetSuggestionController } from "@/src/interface-adapters/controllers/suggestions/get-suggestion.controller";
import type { IListAnsweredSuggestionsController } from "@/src/interface-adapters/controllers/suggestions/list-answered-suggestions.controller";
import type { IListSuggestionsController } from "@/src/interface-adapters/controllers/suggestions/list-suggestions.controller";
import type { ISuggestGameController } from "@/src/interface-adapters/controllers/suggestions/suggest-game.controller";
import type { IUpdateGameController } from "@/src/interface-adapters/controllers/suggestions/update-game.controller";

// Each list keeps its lines in alphabetical order, so two batches adding to it merge cleanly
// (docs/build-plan.md, Code map).
export const DI_SYMBOLS = {
  AdminAccount: Symbol.for("AdminAccount"),
  IAddGameController: Symbol.for("IAddGameController"),
  IAddGameUseCase: Symbol.for("IAddGameUseCase"),
  IAddUserGameController: Symbol.for("IAddUserGameController"),
  IAddUserGameUseCase: Symbol.for("IAddUserGameUseCase"),
  IAnswerFriendRequestController: Symbol.for("IAnswerFriendRequestController"),
  IAnswerFriendRequestUseCase: Symbol.for("IAnswerFriendRequestUseCase"),
  IAnswerSuggestionController: Symbol.for("IAnswerSuggestionController"),
  IAnswerSuggestionUseCase: Symbol.for("IAnswerSuggestionUseCase"),
  IAuthenticationService: Symbol.for("IAuthenticationService"),
  ICancelFriendRequestController: Symbol.for("ICancelFriendRequestController"),
  ICancelFriendRequestUseCase: Symbol.for("ICancelFriendRequestUseCase"),
  ICheckFriendLinkController: Symbol.for("ICheckFriendLinkController"),
  ICheckFriendLinkUseCase: Symbol.for("ICheckFriendLinkUseCase"),
  ICreateProfileController: Symbol.for("ICreateProfileController"),
  ICreateProfileUseCase: Symbol.for("ICreateProfileUseCase"),
  IFileStorage: Symbol.for("IFileStorage"),
  IFindGamesToEditController: Symbol.for("IFindGamesToEditController"),
  IFindGamesToEditUseCase: Symbol.for("IFindGamesToEditUseCase"),
  IFriendLinksRepository: Symbol.for("IFriendLinksRepository"),
  IFriendRequestsRepository: Symbol.for("IFriendRequestsRepository"),
  IFriendshipsRepository: Symbol.for("IFriendshipsRepository"),
  IGameSuggestionsRepository: Symbol.for("IGameSuggestionsRepository"),
  IGamesRepository: Symbol.for("IGamesRepository"),
  IGetAccountStateController: Symbol.for("IGetAccountStateController"),
  IGetAccountStateUseCase: Symbol.for("IGetAccountStateUseCase"),
  IGetFriendController: Symbol.for("IGetFriendController"),
  IGetFriendLinkController: Symbol.for("IGetFriendLinkController"),
  IGetFriendLinkUseCase: Symbol.for("IGetFriendLinkUseCase"),
  IGetFriendUseCase: Symbol.for("IGetFriendUseCase"),
  IGetGameController: Symbol.for("IGetGameController"),
  IGetGameToEditController: Symbol.for("IGetGameToEditController"),
  IGetGameToEditUseCase: Symbol.for("IGetGameToEditUseCase"),
  IGetGameUseCase: Symbol.for("IGetGameUseCase"),
  IGetNoticeSettingsController: Symbol.for("IGetNoticeSettingsController"),
  IGetNoticeSettingsUseCase: Symbol.for("IGetNoticeSettingsUseCase"),
  IGetProfileController: Symbol.for("IGetProfileController"),
  IGetProfileUseCase: Symbol.for("IGetProfileUseCase"),
  IGetSuggestionController: Symbol.for("IGetSuggestionController"),
  IGetSuggestionUseCase: Symbol.for("IGetSuggestionUseCase"),
  IGetTabCountsController: Symbol.for("IGetTabCountsController"),
  IGetTabCountsUseCase: Symbol.for("IGetTabCountsUseCase"),
  IGetUserGameController: Symbol.for("IGetUserGameController"),
  IGetUserGameUseCase: Symbol.for("IGetUserGameUseCase"),
  IListAnsweredSuggestionsController: Symbol.for(
    "IListAnsweredSuggestionsController",
  ),
  IListAnsweredSuggestionsUseCase: Symbol.for(
    "IListAnsweredSuggestionsUseCase",
  ),
  IListFriendsController: Symbol.for("IListFriendsController"),
  IListFriendsUseCase: Symbol.for("IListFriendsUseCase"),
  IListInboxController: Symbol.for("IListInboxController"),
  IListInboxUseCase: Symbol.for("IListInboxUseCase"),
  IListLibraryController: Symbol.for("IListLibraryController"),
  IListLibraryUseCase: Symbol.for("IListLibraryUseCase"),
  IListMyLibraryController: Symbol.for("IListMyLibraryController"),
  IListMyLibraryUseCase: Symbol.for("IListMyLibraryUseCase"),
  IListPeopleYouMayKnowController: Symbol.for(
    "IListPeopleYouMayKnowController",
  ),
  IListPeopleYouMayKnowUseCase: Symbol.for("IListPeopleYouMayKnowUseCase"),
  IListSuggestionsController: Symbol.for("IListSuggestionsController"),
  IListSuggestionsUseCase: Symbol.for("IListSuggestionsUseCase"),
  IListTakenPiecesController: Symbol.for("IListTakenPiecesController"),
  IListTakenPiecesUseCase: Symbol.for("IListTakenPiecesUseCase"),
  ILoansRepository: Symbol.for("ILoansRepository"),
  ILoggerService: Symbol.for("ILoggerService"),
  IMakeFriendLinkController: Symbol.for("IMakeFriendLinkController"),
  IMakeFriendLinkUseCase: Symbol.for("IMakeFriendLinkUseCase"),
  IMarkInboxReadController: Symbol.for("IMarkInboxReadController"),
  IMarkInboxReadUseCase: Symbol.for("IMarkInboxReadUseCase"),
  INoticesRepository: Symbol.for("INoticesRepository"),
  IOpenFriendLinkController: Symbol.for("IOpenFriendLinkController"),
  IOpenFriendLinkUseCase: Symbol.for("IOpenFriendLinkUseCase"),
  IPutInBoxController: Symbol.for("IPutInBoxController"),
  IPutInBoxUseCase: Symbol.for("IPutInBoxUseCase"),
  IRemovePhotoController: Symbol.for("IRemovePhotoController"),
  IRemovePhotoUseCase: Symbol.for("IRemovePhotoUseCase"),
  IRemoveUserGameController: Symbol.for("IRemoveUserGameController"),
  IRemoveUserGameUseCase: Symbol.for("IRemoveUserGameUseCase"),
  IRemovedUsersRepository: Symbol.for("IRemovedUsersRepository"),
  IRequireAdmin: Symbol.for("IRequireAdmin"),
  ISearchGamesController: Symbol.for("ISearchGamesController"),
  ISearchGamesUseCase: Symbol.for("ISearchGamesUseCase"),
  ISendFriendRequestController: Symbol.for("ISendFriendRequestController"),
  ISendFriendRequestUseCase: Symbol.for("ISendFriendRequestUseCase"),
  ISetLendingController: Symbol.for("ISetLendingController"),
  ISetLendingUseCase: Symbol.for("ISetLendingUseCase"),
  ISetPassAlongForAllController: Symbol.for("ISetPassAlongForAllController"),
  ISetPassAlongForAllUseCase: Symbol.for("ISetPassAlongForAllUseCase"),
  ISetPhotoController: Symbol.for("ISetPhotoController"),
  ISetPhotoUseCase: Symbol.for("ISetPhotoUseCase"),
  ISuggestGameController: Symbol.for("ISuggestGameController"),
  ISuggestGameUseCase: Symbol.for("ISuggestGameUseCase"),
  ITransactionManagerService: Symbol.for("ITransactionManagerService"),
  IUnfriendController: Symbol.for("IUnfriendController"),
  IUnfriendUseCase: Symbol.for("IUnfriendUseCase"),
  IUpdateGameController: Symbol.for("IUpdateGameController"),
  IUpdateGameUseCase: Symbol.for("IUpdateGameUseCase"),
  IUpdateNoticeSettingsController: Symbol.for(
    "IUpdateNoticeSettingsController",
  ),
  IUpdateNoticeSettingsUseCase: Symbol.for("IUpdateNoticeSettingsUseCase"),
  IUpdateProfileController: Symbol.for("IUpdateProfileController"),
  IUpdateProfileUseCase: Symbol.for("IUpdateProfileUseCase"),
  IUpdateUserGameController: Symbol.for("IUpdateUserGameController"),
  IUpdateUserGameUseCase: Symbol.for("IUpdateUserGameUseCase"),
  IUserGamesRepository: Symbol.for("IUserGamesRepository"),
  IUserProfilesRepository: Symbol.for("IUserProfilesRepository"),
  IUserSettingsRepository: Symbol.for("IUserSettingsRepository"),
};

export interface DI_RETURN_TYPES {
  AdminAccount: AdminAccount;
  IAddGameController: IAddGameController;
  IAddGameUseCase: IAddGameUseCase;
  IAddUserGameController: IAddUserGameController;
  IAddUserGameUseCase: IAddUserGameUseCase;
  IAnswerFriendRequestController: IAnswerFriendRequestController;
  IAnswerFriendRequestUseCase: IAnswerFriendRequestUseCase;
  IAnswerSuggestionController: IAnswerSuggestionController;
  IAnswerSuggestionUseCase: IAnswerSuggestionUseCase;
  IAuthenticationService: IAuthenticationService;
  ICancelFriendRequestController: ICancelFriendRequestController;
  ICancelFriendRequestUseCase: ICancelFriendRequestUseCase;
  ICheckFriendLinkController: ICheckFriendLinkController;
  ICheckFriendLinkUseCase: ICheckFriendLinkUseCase;
  ICreateProfileController: ICreateProfileController;
  ICreateProfileUseCase: ICreateProfileUseCase;
  IFileStorage: IFileStorage;
  IFindGamesToEditController: IFindGamesToEditController;
  IFindGamesToEditUseCase: IFindGamesToEditUseCase;
  IFriendLinksRepository: IFriendLinksRepository;
  IFriendRequestsRepository: IFriendRequestsRepository;
  IFriendshipsRepository: IFriendshipsRepository;
  IGameSuggestionsRepository: IGameSuggestionsRepository;
  IGamesRepository: IGamesRepository;
  IGetAccountStateController: IGetAccountStateController;
  IGetAccountStateUseCase: IGetAccountStateUseCase;
  IGetFriendController: IGetFriendController;
  IGetFriendLinkController: IGetFriendLinkController;
  IGetFriendLinkUseCase: IGetFriendLinkUseCase;
  IGetFriendUseCase: IGetFriendUseCase;
  IGetGameController: IGetGameController;
  IGetGameToEditController: IGetGameToEditController;
  IGetGameToEditUseCase: IGetGameToEditUseCase;
  IGetGameUseCase: IGetGameUseCase;
  IGetNoticeSettingsController: IGetNoticeSettingsController;
  IGetNoticeSettingsUseCase: IGetNoticeSettingsUseCase;
  IGetProfileController: IGetProfileController;
  IGetProfileUseCase: IGetProfileUseCase;
  IGetSuggestionController: IGetSuggestionController;
  IGetSuggestionUseCase: IGetSuggestionUseCase;
  IGetTabCountsController: IGetTabCountsController;
  IGetTabCountsUseCase: IGetTabCountsUseCase;
  IGetUserGameController: IGetUserGameController;
  IGetUserGameUseCase: IGetUserGameUseCase;
  IListAnsweredSuggestionsController: IListAnsweredSuggestionsController;
  IListAnsweredSuggestionsUseCase: IListAnsweredSuggestionsUseCase;
  IListFriendsController: IListFriendsController;
  IListFriendsUseCase: IListFriendsUseCase;
  IListInboxController: IListInboxController;
  IListInboxUseCase: IListInboxUseCase;
  IListLibraryController: IListLibraryController;
  IListLibraryUseCase: IListLibraryUseCase;
  IListMyLibraryController: IListMyLibraryController;
  IListMyLibraryUseCase: IListMyLibraryUseCase;
  IListPeopleYouMayKnowController: IListPeopleYouMayKnowController;
  IListPeopleYouMayKnowUseCase: IListPeopleYouMayKnowUseCase;
  IListSuggestionsController: IListSuggestionsController;
  IListSuggestionsUseCase: IListSuggestionsUseCase;
  IListTakenPiecesController: IListTakenPiecesController;
  IListTakenPiecesUseCase: IListTakenPiecesUseCase;
  ILoansRepository: ILoansRepository;
  ILoggerService: ILoggerService;
  IMakeFriendLinkController: IMakeFriendLinkController;
  IMakeFriendLinkUseCase: IMakeFriendLinkUseCase;
  IMarkInboxReadController: IMarkInboxReadController;
  IMarkInboxReadUseCase: IMarkInboxReadUseCase;
  INoticesRepository: INoticesRepository;
  IOpenFriendLinkController: IOpenFriendLinkController;
  IOpenFriendLinkUseCase: IOpenFriendLinkUseCase;
  IPutInBoxController: IPutInBoxController;
  IPutInBoxUseCase: IPutInBoxUseCase;
  IRemovePhotoController: IRemovePhotoController;
  IRemovePhotoUseCase: IRemovePhotoUseCase;
  IRemoveUserGameController: IRemoveUserGameController;
  IRemoveUserGameUseCase: IRemoveUserGameUseCase;
  IRemovedUsersRepository: IRemovedUsersRepository;
  IRequireAdmin: IRequireAdmin;
  ISearchGamesController: ISearchGamesController;
  ISearchGamesUseCase: ISearchGamesUseCase;
  ISendFriendRequestController: ISendFriendRequestController;
  ISendFriendRequestUseCase: ISendFriendRequestUseCase;
  ISetLendingController: ISetLendingController;
  ISetLendingUseCase: ISetLendingUseCase;
  ISetPassAlongForAllController: ISetPassAlongForAllController;
  ISetPassAlongForAllUseCase: ISetPassAlongForAllUseCase;
  ISetPhotoController: ISetPhotoController;
  ISetPhotoUseCase: ISetPhotoUseCase;
  ISuggestGameController: ISuggestGameController;
  ISuggestGameUseCase: ISuggestGameUseCase;
  ITransactionManagerService: ITransactionManagerService;
  IUnfriendController: IUnfriendController;
  IUnfriendUseCase: IUnfriendUseCase;
  IUpdateGameController: IUpdateGameController;
  IUpdateGameUseCase: IUpdateGameUseCase;
  IUpdateNoticeSettingsController: IUpdateNoticeSettingsController;
  IUpdateNoticeSettingsUseCase: IUpdateNoticeSettingsUseCase;
  IUpdateProfileController: IUpdateProfileController;
  IUpdateProfileUseCase: IUpdateProfileUseCase;
  IUpdateUserGameController: IUpdateUserGameController;
  IUpdateUserGameUseCase: IUpdateUserGameUseCase;
  IUserGamesRepository: IUserGamesRepository;
  IUserProfilesRepository: IUserProfilesRepository;
  IUserSettingsRepository: IUserSettingsRepository;
}
