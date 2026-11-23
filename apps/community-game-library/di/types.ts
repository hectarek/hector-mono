import type { IFriendLinksRepository } from "@/src/application/repositories/friend-links.repository.interface";
import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
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
import type { IRunDailyUseCase } from "@/src/application/use-cases/daily/run-daily.use-case";
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
import type { IAnswerMoreTimeUseCase } from "@/src/application/use-cases/loans/answer-more-time.use-case";
// Each list keeps its lines in alphabetical order, so two batches adding to it merge cleanly
// (docs/build-plan.md, Code map).
import type { IAnswerRequestUseCase } from "@/src/application/use-cases/loans/answer-request.use-case";
import type { IAskMoreTimeUseCase } from "@/src/application/use-cases/loans/ask-more-time.use-case";
import type { ICallBackUseCase } from "@/src/application/use-cases/loans/call-back.use-case";
import type { ICancelLoanUseCase } from "@/src/application/use-cases/loans/cancel-loan.use-case";
import type { IChangeDueDateUseCase } from "@/src/application/use-cases/loans/change-due-date.use-case";
import type { IConfirmPassAlongUseCase } from "@/src/application/use-cases/loans/confirm-pass-along.use-case";
import type { IConfirmPickUpUseCase } from "@/src/application/use-cases/loans/confirm-pick-up.use-case";
import type { IConfirmReturnUseCase } from "@/src/application/use-cases/loans/confirm-return.use-case";
import type { IGetLoanUseCase } from "@/src/application/use-cases/loans/get-loan.use-case";
import type { IGetRecordLoanChoicesUseCase } from "@/src/application/use-cases/loans/get-record-loan-choices.use-case";
import type { IGiveBackUseCase } from "@/src/application/use-cases/loans/give-back.use-case";
import type { IListLoansUseCase } from "@/src/application/use-cases/loans/list-loans.use-case";
import type { IListPastLoansUseCase } from "@/src/application/use-cases/loans/list-past-loans.use-case";
import type { IPassAlongUseCase } from "@/src/application/use-cases/loans/pass-along.use-case";
import type { IRecordLoanUseCase } from "@/src/application/use-cases/loans/record-loan.use-case";
import type { IRequestLoanUseCase } from "@/src/application/use-cases/loans/request-loan.use-case";
import type { ITakeBackPassAlongUseCase } from "@/src/application/use-cases/loans/take-back-pass-along.use-case";
import type { IWithdrawRequestUseCase } from "@/src/application/use-cases/loans/withdraw-request.use-case";
import type { IAddGameToNightUseCase } from "@/src/application/use-cases/nights/add-game-to-night.use-case";
import type { IAnswerNightUseCase } from "@/src/application/use-cases/nights/answer-night.use-case";
import type { ICheckNightLinkUseCase } from "@/src/application/use-cases/nights/check-night-link.use-case";
import type { ICreateNightUseCase } from "@/src/application/use-cases/nights/create-night.use-case";
import type { IGetInviteChoicesUseCase } from "@/src/application/use-cases/nights/get-invite-choices.use-case";
import type { IGetNightUseCase } from "@/src/application/use-cases/nights/get-night.use-case";
import type { IGetNightGameChoicesUseCase } from "@/src/application/use-cases/nights/get-night-game-choices.use-case";
import type { IInviteToNightUseCase } from "@/src/application/use-cases/nights/invite-to-night.use-case";
import type { IListNightsUseCase } from "@/src/application/use-cases/nights/list-nights.use-case";
import type { IMakeNightLinkUseCase } from "@/src/application/use-cases/nights/make-night-link.use-case";
import type { IOpenNightLinkUseCase } from "@/src/application/use-cases/nights/open-night-link.use-case";
import type { IRemoveFromWaitlistUseCase } from "@/src/application/use-cases/nights/remove-from-waitlist.use-case";
import type { IRemoveGameFromNightUseCase } from "@/src/application/use-cases/nights/remove-game-from-night.use-case";
import type { IUpdateNightUseCase } from "@/src/application/use-cases/nights/update-night.use-case";
import type { IVoteUseCase } from "@/src/application/use-cases/nights/vote.use-case";
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
import type { IRunDailyController } from "@/src/interface-adapters/controllers/daily/run-daily.controller";
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
import type { IAnswerMoreTimeController } from "@/src/interface-adapters/controllers/loans/answer-more-time.controller";
import type { IAnswerRequestController } from "@/src/interface-adapters/controllers/loans/answer-request.controller";
import type { IAskMoreTimeController } from "@/src/interface-adapters/controllers/loans/ask-more-time.controller";
import type { ICallBackController } from "@/src/interface-adapters/controllers/loans/call-back.controller";
import type { ICancelLoanController } from "@/src/interface-adapters/controllers/loans/cancel-loan.controller";
import type { IChangeDueDateController } from "@/src/interface-adapters/controllers/loans/change-due-date.controller";
import type { IConfirmPassAlongController } from "@/src/interface-adapters/controllers/loans/confirm-pass-along.controller";
import type { IConfirmPickUpController } from "@/src/interface-adapters/controllers/loans/confirm-pick-up.controller";
import type { IConfirmReturnController } from "@/src/interface-adapters/controllers/loans/confirm-return.controller";
import type { IGetLoanController } from "@/src/interface-adapters/controllers/loans/get-loan.controller";
import type { IGetRecordLoanChoicesController } from "@/src/interface-adapters/controllers/loans/get-record-loan-choices.controller";
import type { IGiveBackController } from "@/src/interface-adapters/controllers/loans/give-back.controller";
import type { IListLoansController } from "@/src/interface-adapters/controllers/loans/list-loans.controller";
import type { IListPastLoansController } from "@/src/interface-adapters/controllers/loans/list-past-loans.controller";
import type { IPassAlongController } from "@/src/interface-adapters/controllers/loans/pass-along.controller";
import type { IRecordLoanController } from "@/src/interface-adapters/controllers/loans/record-loan.controller";
import type { IRequestLoanController } from "@/src/interface-adapters/controllers/loans/request-loan.controller";
import type { ITakeBackPassAlongController } from "@/src/interface-adapters/controllers/loans/take-back-pass-along.controller";
import type { IWithdrawRequestController } from "@/src/interface-adapters/controllers/loans/withdraw-request.controller";
import type { IAddGameToNightController } from "@/src/interface-adapters/controllers/nights/add-game-to-night.controller";
import type { IAnswerNightController } from "@/src/interface-adapters/controllers/nights/answer-night.controller";
import type { ICheckNightLinkController } from "@/src/interface-adapters/controllers/nights/check-night-link.controller";
import type { ICreateNightController } from "@/src/interface-adapters/controllers/nights/create-night.controller";
import type { IGetInviteChoicesController } from "@/src/interface-adapters/controllers/nights/get-invite-choices.controller";
import type { IGetNightController } from "@/src/interface-adapters/controllers/nights/get-night.controller";
import type { IGetNightGameChoicesController } from "@/src/interface-adapters/controllers/nights/get-night-game-choices.controller";
import type { IInviteToNightController } from "@/src/interface-adapters/controllers/nights/invite-to-night.controller";
import type { IListNightsController } from "@/src/interface-adapters/controllers/nights/list-nights.controller";
import type { IMakeNightLinkController } from "@/src/interface-adapters/controllers/nights/make-night-link.controller";
import type { IOpenNightLinkController } from "@/src/interface-adapters/controllers/nights/open-night-link.controller";
import type { IRemoveFromWaitlistController } from "@/src/interface-adapters/controllers/nights/remove-from-waitlist.controller";
import type { IRemoveGameFromNightController } from "@/src/interface-adapters/controllers/nights/remove-game-from-night.controller";
import type { IUpdateNightController } from "@/src/interface-adapters/controllers/nights/update-night.controller";
import type { IVoteController } from "@/src/interface-adapters/controllers/nights/vote.controller";
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

export const DI_SYMBOLS = {
  AdminAccount: Symbol.for("AdminAccount"),
  IAddGameController: Symbol.for("IAddGameController"),
  IAddGameToNightController: Symbol.for("IAddGameToNightController"),
  IAddGameToNightUseCase: Symbol.for("IAddGameToNightUseCase"),
  IAddGameUseCase: Symbol.for("IAddGameUseCase"),
  IAddUserGameController: Symbol.for("IAddUserGameController"),
  IAddUserGameUseCase: Symbol.for("IAddUserGameUseCase"),
  IAnswerFriendRequestController: Symbol.for("IAnswerFriendRequestController"),
  IAnswerFriendRequestUseCase: Symbol.for("IAnswerFriendRequestUseCase"),
  IAnswerMoreTimeController: Symbol.for("IAnswerMoreTimeController"),
  IAnswerMoreTimeUseCase: Symbol.for("IAnswerMoreTimeUseCase"),
  IAnswerNightController: Symbol.for("IAnswerNightController"),
  IAnswerNightUseCase: Symbol.for("IAnswerNightUseCase"),
  IAnswerRequestController: Symbol.for("IAnswerRequestController"),
  IAnswerRequestUseCase: Symbol.for("IAnswerRequestUseCase"),
  IAnswerSuggestionController: Symbol.for("IAnswerSuggestionController"),
  IAnswerSuggestionUseCase: Symbol.for("IAnswerSuggestionUseCase"),
  IAskMoreTimeController: Symbol.for("IAskMoreTimeController"),
  IAskMoreTimeUseCase: Symbol.for("IAskMoreTimeUseCase"),
  IAuthenticationService: Symbol.for("IAuthenticationService"),
  ICallBackController: Symbol.for("ICallBackController"),
  ICallBackUseCase: Symbol.for("ICallBackUseCase"),
  ICancelFriendRequestController: Symbol.for("ICancelFriendRequestController"),
  ICancelFriendRequestUseCase: Symbol.for("ICancelFriendRequestUseCase"),
  ICancelLoanController: Symbol.for("ICancelLoanController"),
  ICancelLoanUseCase: Symbol.for("ICancelLoanUseCase"),
  IChangeDueDateController: Symbol.for("IChangeDueDateController"),
  IChangeDueDateUseCase: Symbol.for("IChangeDueDateUseCase"),
  ICheckFriendLinkController: Symbol.for("ICheckFriendLinkController"),
  ICheckFriendLinkUseCase: Symbol.for("ICheckFriendLinkUseCase"),
  ICheckNightLinkController: Symbol.for("ICheckNightLinkController"),
  ICheckNightLinkUseCase: Symbol.for("ICheckNightLinkUseCase"),
  IConfirmPassAlongController: Symbol.for("IConfirmPassAlongController"),
  IConfirmPassAlongUseCase: Symbol.for("IConfirmPassAlongUseCase"),
  IConfirmPickUpController: Symbol.for("IConfirmPickUpController"),
  IConfirmPickUpUseCase: Symbol.for("IConfirmPickUpUseCase"),
  IConfirmReturnController: Symbol.for("IConfirmReturnController"),
  IConfirmReturnUseCase: Symbol.for("IConfirmReturnUseCase"),
  ICreateNightController: Symbol.for("ICreateNightController"),
  ICreateNightUseCase: Symbol.for("ICreateNightUseCase"),
  ICreateProfileController: Symbol.for("ICreateProfileController"),
  ICreateProfileUseCase: Symbol.for("ICreateProfileUseCase"),
  IFileStorage: Symbol.for("IFileStorage"),
  IFindGamesToEditController: Symbol.for("IFindGamesToEditController"),
  IFindGamesToEditUseCase: Symbol.for("IFindGamesToEditUseCase"),
  IFriendLinksRepository: Symbol.for("IFriendLinksRepository"),
  IFriendRequestsRepository: Symbol.for("IFriendRequestsRepository"),
  IFriendshipsRepository: Symbol.for("IFriendshipsRepository"),
  IGameNightsRepository: Symbol.for("IGameNightsRepository"),
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
  IGetInviteChoicesController: Symbol.for("IGetInviteChoicesController"),
  IGetInviteChoicesUseCase: Symbol.for("IGetInviteChoicesUseCase"),
  IGetLoanController: Symbol.for("IGetLoanController"),
  IGetLoanUseCase: Symbol.for("IGetLoanUseCase"),
  IGetNightController: Symbol.for("IGetNightController"),
  IGetNightGameChoicesController: Symbol.for("IGetNightGameChoicesController"),
  IGetNightGameChoicesUseCase: Symbol.for("IGetNightGameChoicesUseCase"),
  IGetNightUseCase: Symbol.for("IGetNightUseCase"),
  IGetNoticeSettingsController: Symbol.for("IGetNoticeSettingsController"),
  IGetNoticeSettingsUseCase: Symbol.for("IGetNoticeSettingsUseCase"),
  IGetProfileController: Symbol.for("IGetProfileController"),
  IGetProfileUseCase: Symbol.for("IGetProfileUseCase"),
  IGetRecordLoanChoicesController: Symbol.for(
    "IGetRecordLoanChoicesController",
  ),
  IGetRecordLoanChoicesUseCase: Symbol.for("IGetRecordLoanChoicesUseCase"),
  IGetSuggestionController: Symbol.for("IGetSuggestionController"),
  IGetSuggestionUseCase: Symbol.for("IGetSuggestionUseCase"),
  IGetTabCountsController: Symbol.for("IGetTabCountsController"),
  IGetTabCountsUseCase: Symbol.for("IGetTabCountsUseCase"),
  IGetUserGameController: Symbol.for("IGetUserGameController"),
  IGetUserGameUseCase: Symbol.for("IGetUserGameUseCase"),
  IGiveBackController: Symbol.for("IGiveBackController"),
  IGiveBackUseCase: Symbol.for("IGiveBackUseCase"),
  IInviteToNightController: Symbol.for("IInviteToNightController"),
  IInviteToNightUseCase: Symbol.for("IInviteToNightUseCase"),
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
  IListLoansController: Symbol.for("IListLoansController"),
  IListLoansUseCase: Symbol.for("IListLoansUseCase"),
  IListMyLibraryController: Symbol.for("IListMyLibraryController"),
  IListMyLibraryUseCase: Symbol.for("IListMyLibraryUseCase"),
  IListNightsController: Symbol.for("IListNightsController"),
  IListNightsUseCase: Symbol.for("IListNightsUseCase"),
  IListPastLoansController: Symbol.for("IListPastLoansController"),
  IListPastLoansUseCase: Symbol.for("IListPastLoansUseCase"),
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
  IMakeNightLinkController: Symbol.for("IMakeNightLinkController"),
  IMakeNightLinkUseCase: Symbol.for("IMakeNightLinkUseCase"),
  IMarkInboxReadController: Symbol.for("IMarkInboxReadController"),
  IMarkInboxReadUseCase: Symbol.for("IMarkInboxReadUseCase"),
  INoticesRepository: Symbol.for("INoticesRepository"),
  IOpenFriendLinkController: Symbol.for("IOpenFriendLinkController"),
  IOpenFriendLinkUseCase: Symbol.for("IOpenFriendLinkUseCase"),
  IOpenNightLinkController: Symbol.for("IOpenNightLinkController"),
  IOpenNightLinkUseCase: Symbol.for("IOpenNightLinkUseCase"),
  IPassAlongController: Symbol.for("IPassAlongController"),
  IPassAlongUseCase: Symbol.for("IPassAlongUseCase"),
  IPutInBoxController: Symbol.for("IPutInBoxController"),
  IPutInBoxUseCase: Symbol.for("IPutInBoxUseCase"),
  IRecordLoanController: Symbol.for("IRecordLoanController"),
  IRecordLoanUseCase: Symbol.for("IRecordLoanUseCase"),
  IRemoveFromWaitlistController: Symbol.for("IRemoveFromWaitlistController"),
  IRemoveFromWaitlistUseCase: Symbol.for("IRemoveFromWaitlistUseCase"),
  IRemoveGameFromNightController: Symbol.for("IRemoveGameFromNightController"),
  IRemoveGameFromNightUseCase: Symbol.for("IRemoveGameFromNightUseCase"),
  IRemovePhotoController: Symbol.for("IRemovePhotoController"),
  IRemovePhotoUseCase: Symbol.for("IRemovePhotoUseCase"),
  IRemoveUserGameController: Symbol.for("IRemoveUserGameController"),
  IRemoveUserGameUseCase: Symbol.for("IRemoveUserGameUseCase"),
  IRemovedUsersRepository: Symbol.for("IRemovedUsersRepository"),
  IRequestLoanController: Symbol.for("IRequestLoanController"),
  IRequestLoanUseCase: Symbol.for("IRequestLoanUseCase"),
  IRequireAdmin: Symbol.for("IRequireAdmin"),
  IRunDailyController: Symbol.for("IRunDailyController"),
  IRunDailyUseCase: Symbol.for("IRunDailyUseCase"),
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
  ITakeBackPassAlongController: Symbol.for("ITakeBackPassAlongController"),
  ITakeBackPassAlongUseCase: Symbol.for("ITakeBackPassAlongUseCase"),
  ITransactionManagerService: Symbol.for("ITransactionManagerService"),
  IUnfriendController: Symbol.for("IUnfriendController"),
  IUnfriendUseCase: Symbol.for("IUnfriendUseCase"),
  IUpdateGameController: Symbol.for("IUpdateGameController"),
  IUpdateGameUseCase: Symbol.for("IUpdateGameUseCase"),
  IUpdateNightController: Symbol.for("IUpdateNightController"),
  IUpdateNightUseCase: Symbol.for("IUpdateNightUseCase"),
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
  IVoteController: Symbol.for("IVoteController"),
  IVoteUseCase: Symbol.for("IVoteUseCase"),
  IWithdrawRequestController: Symbol.for("IWithdrawRequestController"),
  IWithdrawRequestUseCase: Symbol.for("IWithdrawRequestUseCase"),
};

export interface DI_RETURN_TYPES {
  AdminAccount: AdminAccount;
  IAddGameController: IAddGameController;
  IAddGameToNightController: IAddGameToNightController;
  IAddGameToNightUseCase: IAddGameToNightUseCase;
  IAddGameUseCase: IAddGameUseCase;
  IAddUserGameController: IAddUserGameController;
  IAddUserGameUseCase: IAddUserGameUseCase;
  IAnswerFriendRequestController: IAnswerFriendRequestController;
  IAnswerFriendRequestUseCase: IAnswerFriendRequestUseCase;
  IAnswerMoreTimeController: IAnswerMoreTimeController;
  IAnswerMoreTimeUseCase: IAnswerMoreTimeUseCase;
  IAnswerNightController: IAnswerNightController;
  IAnswerNightUseCase: IAnswerNightUseCase;
  IAnswerRequestController: IAnswerRequestController;
  IAnswerRequestUseCase: IAnswerRequestUseCase;
  IAnswerSuggestionController: IAnswerSuggestionController;
  IAnswerSuggestionUseCase: IAnswerSuggestionUseCase;
  IAskMoreTimeController: IAskMoreTimeController;
  IAskMoreTimeUseCase: IAskMoreTimeUseCase;
  IAuthenticationService: IAuthenticationService;
  ICallBackController: ICallBackController;
  ICallBackUseCase: ICallBackUseCase;
  ICancelFriendRequestController: ICancelFriendRequestController;
  ICancelFriendRequestUseCase: ICancelFriendRequestUseCase;
  ICancelLoanController: ICancelLoanController;
  ICancelLoanUseCase: ICancelLoanUseCase;
  IChangeDueDateController: IChangeDueDateController;
  IChangeDueDateUseCase: IChangeDueDateUseCase;
  ICheckFriendLinkController: ICheckFriendLinkController;
  ICheckFriendLinkUseCase: ICheckFriendLinkUseCase;
  ICheckNightLinkController: ICheckNightLinkController;
  ICheckNightLinkUseCase: ICheckNightLinkUseCase;
  IConfirmPassAlongController: IConfirmPassAlongController;
  IConfirmPassAlongUseCase: IConfirmPassAlongUseCase;
  IConfirmPickUpController: IConfirmPickUpController;
  IConfirmPickUpUseCase: IConfirmPickUpUseCase;
  IConfirmReturnController: IConfirmReturnController;
  IConfirmReturnUseCase: IConfirmReturnUseCase;
  ICreateNightController: ICreateNightController;
  ICreateNightUseCase: ICreateNightUseCase;
  ICreateProfileController: ICreateProfileController;
  ICreateProfileUseCase: ICreateProfileUseCase;
  IFileStorage: IFileStorage;
  IFindGamesToEditController: IFindGamesToEditController;
  IFindGamesToEditUseCase: IFindGamesToEditUseCase;
  IFriendLinksRepository: IFriendLinksRepository;
  IFriendRequestsRepository: IFriendRequestsRepository;
  IFriendshipsRepository: IFriendshipsRepository;
  IGameNightsRepository: IGameNightsRepository;
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
  IGetInviteChoicesController: IGetInviteChoicesController;
  IGetInviteChoicesUseCase: IGetInviteChoicesUseCase;
  IGetLoanController: IGetLoanController;
  IGetLoanUseCase: IGetLoanUseCase;
  IGetNightController: IGetNightController;
  IGetNightGameChoicesController: IGetNightGameChoicesController;
  IGetNightGameChoicesUseCase: IGetNightGameChoicesUseCase;
  IGetNightUseCase: IGetNightUseCase;
  IGetNoticeSettingsController: IGetNoticeSettingsController;
  IGetNoticeSettingsUseCase: IGetNoticeSettingsUseCase;
  IGetProfileController: IGetProfileController;
  IGetProfileUseCase: IGetProfileUseCase;
  IGetRecordLoanChoicesController: IGetRecordLoanChoicesController;
  IGetRecordLoanChoicesUseCase: IGetRecordLoanChoicesUseCase;
  IGetSuggestionController: IGetSuggestionController;
  IGetSuggestionUseCase: IGetSuggestionUseCase;
  IGetTabCountsController: IGetTabCountsController;
  IGetTabCountsUseCase: IGetTabCountsUseCase;
  IGetUserGameController: IGetUserGameController;
  IGetUserGameUseCase: IGetUserGameUseCase;
  IGiveBackController: IGiveBackController;
  IGiveBackUseCase: IGiveBackUseCase;
  IInviteToNightController: IInviteToNightController;
  IInviteToNightUseCase: IInviteToNightUseCase;
  IListAnsweredSuggestionsController: IListAnsweredSuggestionsController;
  IListAnsweredSuggestionsUseCase: IListAnsweredSuggestionsUseCase;
  IListFriendsController: IListFriendsController;
  IListFriendsUseCase: IListFriendsUseCase;
  IListInboxController: IListInboxController;
  IListInboxUseCase: IListInboxUseCase;
  IListLibraryController: IListLibraryController;
  IListLibraryUseCase: IListLibraryUseCase;
  IListLoansController: IListLoansController;
  IListLoansUseCase: IListLoansUseCase;
  IListMyLibraryController: IListMyLibraryController;
  IListMyLibraryUseCase: IListMyLibraryUseCase;
  IListNightsController: IListNightsController;
  IListNightsUseCase: IListNightsUseCase;
  IListPastLoansController: IListPastLoansController;
  IListPastLoansUseCase: IListPastLoansUseCase;
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
  IMakeNightLinkController: IMakeNightLinkController;
  IMakeNightLinkUseCase: IMakeNightLinkUseCase;
  IMarkInboxReadController: IMarkInboxReadController;
  IMarkInboxReadUseCase: IMarkInboxReadUseCase;
  INoticesRepository: INoticesRepository;
  IOpenFriendLinkController: IOpenFriendLinkController;
  IOpenFriendLinkUseCase: IOpenFriendLinkUseCase;
  IOpenNightLinkController: IOpenNightLinkController;
  IOpenNightLinkUseCase: IOpenNightLinkUseCase;
  IPassAlongController: IPassAlongController;
  IPassAlongUseCase: IPassAlongUseCase;
  IPutInBoxController: IPutInBoxController;
  IPutInBoxUseCase: IPutInBoxUseCase;
  IRecordLoanController: IRecordLoanController;
  IRecordLoanUseCase: IRecordLoanUseCase;
  IRemoveFromWaitlistController: IRemoveFromWaitlistController;
  IRemoveFromWaitlistUseCase: IRemoveFromWaitlistUseCase;
  IRemoveGameFromNightController: IRemoveGameFromNightController;
  IRemoveGameFromNightUseCase: IRemoveGameFromNightUseCase;
  IRemovePhotoController: IRemovePhotoController;
  IRemovePhotoUseCase: IRemovePhotoUseCase;
  IRemoveUserGameController: IRemoveUserGameController;
  IRemoveUserGameUseCase: IRemoveUserGameUseCase;
  IRemovedUsersRepository: IRemovedUsersRepository;
  IRequestLoanController: IRequestLoanController;
  IRequestLoanUseCase: IRequestLoanUseCase;
  IRequireAdmin: IRequireAdmin;
  IRunDailyController: IRunDailyController;
  IRunDailyUseCase: IRunDailyUseCase;
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
  ITakeBackPassAlongController: ITakeBackPassAlongController;
  ITakeBackPassAlongUseCase: ITakeBackPassAlongUseCase;
  ITransactionManagerService: ITransactionManagerService;
  IUnfriendController: IUnfriendController;
  IUnfriendUseCase: IUnfriendUseCase;
  IUpdateGameController: IUpdateGameController;
  IUpdateGameUseCase: IUpdateGameUseCase;
  IUpdateNightController: IUpdateNightController;
  IUpdateNightUseCase: IUpdateNightUseCase;
  IUpdateNoticeSettingsController: IUpdateNoticeSettingsController;
  IUpdateNoticeSettingsUseCase: IUpdateNoticeSettingsUseCase;
  IUpdateProfileController: IUpdateProfileController;
  IUpdateProfileUseCase: IUpdateProfileUseCase;
  IUpdateUserGameController: IUpdateUserGameController;
  IUpdateUserGameUseCase: IUpdateUserGameUseCase;
  IUserGamesRepository: IUserGamesRepository;
  IUserProfilesRepository: IUserProfilesRepository;
  IUserSettingsRepository: IUserSettingsRepository;
  IVoteController: IVoteController;
  IVoteUseCase: IVoteUseCase;
  IWithdrawRequestController: IWithdrawRequestController;
  IWithdrawRequestUseCase: IWithdrawRequestUseCase;
}
