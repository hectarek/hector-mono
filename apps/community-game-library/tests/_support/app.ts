// Every use case wired to one set of repositories, plus the design canvas's cast, so a test reads
// like the feature. Inside describeEachBackend the same tests run twice: on the in-memory mocks
// and on the real repositories (PGlite). Recipes' harness: each unit adds its repositories and
// use cases here.
import { beforeEach, describe } from "bun:test";
import {
  games as gamesTable,
  notices as noticesTable,
  userGames as userGamesTable,
} from "@/db/schema";
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
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireAdmin } from "@/src/application/use-cases/admin/require-admin";
import { getGameUseCase } from "@/src/application/use-cases/catalog/get-game.use-case";
import { searchGamesUseCase } from "@/src/application/use-cases/catalog/search-games.use-case";
import { addUserGameUseCase } from "@/src/application/use-cases/copies/add-user-game.use-case";
import { getUserGameUseCase } from "@/src/application/use-cases/copies/get-user-game.use-case";
import { listLibraryUseCase } from "@/src/application/use-cases/copies/list-library.use-case";
import { listMyLibraryUseCase } from "@/src/application/use-cases/copies/list-my-library.use-case";
import { putInBoxUseCase } from "@/src/application/use-cases/copies/put-in-box.use-case";
import { removeUserGameUseCase } from "@/src/application/use-cases/copies/remove-user-game.use-case";
import { setLendingUseCase } from "@/src/application/use-cases/copies/set-lending.use-case";
import { setPassAlongForAllUseCase } from "@/src/application/use-cases/copies/set-pass-along-for-all.use-case";
import { updateUserGameUseCase } from "@/src/application/use-cases/copies/update-user-game.use-case";
import { answerFriendRequestUseCase } from "@/src/application/use-cases/friends/answer-friend-request.use-case";
import { cancelFriendRequestUseCase } from "@/src/application/use-cases/friends/cancel-friend-request.use-case";
import { checkFriendLinkUseCase } from "@/src/application/use-cases/friends/check-friend-link.use-case";
import { getFriendUseCase } from "@/src/application/use-cases/friends/get-friend.use-case";
import { getFriendLinkUseCase } from "@/src/application/use-cases/friends/get-friend-link.use-case";
import { listFriendsUseCase } from "@/src/application/use-cases/friends/list-friends.use-case";
import { listPeopleYouMayKnowUseCase } from "@/src/application/use-cases/friends/list-people-you-may-know.use-case";
import { makeFriendLinkUseCase } from "@/src/application/use-cases/friends/make-friend-link.use-case";
import { openFriendLinkUseCase } from "@/src/application/use-cases/friends/open-friend-link.use-case";
import { requireFriend } from "@/src/application/use-cases/friends/require-friend";
import { sendFriendRequestUseCase } from "@/src/application/use-cases/friends/send-friend-request.use-case";
import { unfriendUseCase } from "@/src/application/use-cases/friends/unfriend.use-case";
import { answerMoreTimeUseCase } from "@/src/application/use-cases/loans/answer-more-time.use-case";
import { answerRequestUseCase } from "@/src/application/use-cases/loans/answer-request.use-case";
import { askMoreTimeUseCase } from "@/src/application/use-cases/loans/ask-more-time.use-case";
import { callBackUseCase } from "@/src/application/use-cases/loans/call-back.use-case";
import { cancelLoanUseCase } from "@/src/application/use-cases/loans/cancel-loan.use-case";
import { changeDueDateUseCase } from "@/src/application/use-cases/loans/change-due-date.use-case";
import { confirmPassAlongUseCase } from "@/src/application/use-cases/loans/confirm-pass-along.use-case";
import { confirmPickUpUseCase } from "@/src/application/use-cases/loans/confirm-pick-up.use-case";
import { confirmReturnUseCase } from "@/src/application/use-cases/loans/confirm-return.use-case";
import { getLoanUseCase } from "@/src/application/use-cases/loans/get-loan.use-case";
import { getRecordLoanChoicesUseCase } from "@/src/application/use-cases/loans/get-record-loan-choices.use-case";
import { giveBackUseCase } from "@/src/application/use-cases/loans/give-back.use-case";
import { listLoansUseCase } from "@/src/application/use-cases/loans/list-loans.use-case";
import { listPastLoansUseCase } from "@/src/application/use-cases/loans/list-past-loans.use-case";
import { passAlongUseCase } from "@/src/application/use-cases/loans/pass-along.use-case";
import { recordLoanUseCase } from "@/src/application/use-cases/loans/record-loan.use-case";
import { requestLoanUseCase } from "@/src/application/use-cases/loans/request-loan.use-case";
import { takeBackPassAlongUseCase } from "@/src/application/use-cases/loans/take-back-pass-along.use-case";
import { withdrawRequestUseCase } from "@/src/application/use-cases/loans/withdraw-request.use-case";
import { getTabCountsUseCase } from "@/src/application/use-cases/notices/get-tab-counts.use-case";
import { listInboxUseCase } from "@/src/application/use-cases/notices/list-inbox.use-case";
import { markInboxReadUseCase } from "@/src/application/use-cases/notices/mark-inbox-read.use-case";
import { createProfileUseCase } from "@/src/application/use-cases/profile/create-profile.use-case";
import { getAccountStateUseCase } from "@/src/application/use-cases/profile/get-account-state.use-case";
import { getNoticeSettingsUseCase } from "@/src/application/use-cases/profile/get-notice-settings.use-case";
import { getProfileUseCase } from "@/src/application/use-cases/profile/get-profile.use-case";
import { listTakenPiecesUseCase } from "@/src/application/use-cases/profile/list-taken-pieces.use-case";
import { removePhotoUseCase } from "@/src/application/use-cases/profile/remove-photo.use-case";
import { setPhotoUseCase } from "@/src/application/use-cases/profile/set-photo.use-case";
import { updateNoticeSettingsUseCase } from "@/src/application/use-cases/profile/update-notice-settings.use-case";
import { updateProfileUseCase } from "@/src/application/use-cases/profile/update-profile.use-case";
import { addGameUseCase } from "@/src/application/use-cases/suggestions/add-game.use-case";
import { answerSuggestionUseCase } from "@/src/application/use-cases/suggestions/answer-suggestion.use-case";
import { findGamesToEditUseCase } from "@/src/application/use-cases/suggestions/find-games-to-edit.use-case";
import { getGameToEditUseCase } from "@/src/application/use-cases/suggestions/get-game-to-edit.use-case";
import { getSuggestionUseCase } from "@/src/application/use-cases/suggestions/get-suggestion.use-case";
import { listAnsweredSuggestionsUseCase } from "@/src/application/use-cases/suggestions/list-answered-suggestions.use-case";
import { listSuggestionsUseCase } from "@/src/application/use-cases/suggestions/list-suggestions.use-case";
import { suggestGameUseCase } from "@/src/application/use-cases/suggestions/suggest-game.use-case";
import { updateGameUseCase } from "@/src/application/use-cases/suggestions/update-game.use-case";
import type { Game } from "@/src/entities/models/game.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import { FriendLinksRepository } from "@/src/infrastructure/repositories/friend-links.repository";
import { MockFriendLinksRepository } from "@/src/infrastructure/repositories/friend-links.repository.mock";
import { FriendRequestsRepository } from "@/src/infrastructure/repositories/friend-requests.repository";
import { MockFriendRequestsRepository } from "@/src/infrastructure/repositories/friend-requests.repository.mock";
import { FriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository";
import { MockFriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository.mock";
import { GameSuggestionsRepository } from "@/src/infrastructure/repositories/game-suggestions.repository";
import { MockGameSuggestionsRepository } from "@/src/infrastructure/repositories/game-suggestions.repository.mock";
import { GamesRepository } from "@/src/infrastructure/repositories/games.repository";
import { MockGamesRepository } from "@/src/infrastructure/repositories/games.repository.mock";
import { LoansRepository } from "@/src/infrastructure/repositories/loans.repository";
import { MockLoansRepository } from "@/src/infrastructure/repositories/loans.repository.mock";
import { NoticesRepository } from "@/src/infrastructure/repositories/notices.repository";
import { MockNoticesRepository } from "@/src/infrastructure/repositories/notices.repository.mock";
import { RemovedUsersRepository } from "@/src/infrastructure/repositories/removed-users.repository";
import { MockRemovedUsersRepository } from "@/src/infrastructure/repositories/removed-users.repository.mock";
import { UserGamesRepository } from "@/src/infrastructure/repositories/user-games.repository";
import { MockUserGamesRepository } from "@/src/infrastructure/repositories/user-games.repository.mock";
import { UserProfilesRepository } from "@/src/infrastructure/repositories/user-profiles.repository";
import { MockUserProfilesRepository } from "@/src/infrastructure/repositories/user-profiles.repository.mock";
import { UserSettingsRepository } from "@/src/infrastructure/repositories/user-settings.repository";
import { MockUserSettingsRepository } from "@/src/infrastructure/repositories/user-settings.repository.mock";
import { MockFileStorageService } from "@/src/infrastructure/services/mock-file-storage.service";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { MockTransactionManagerService } from "@/src/infrastructure/services/mock-transaction-manager.service";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";
import {
  CAST,
  castRows,
  insertCastRows,
  writeCastPeople,
} from "@/tests/_support/cast";
import { resetDatabase, sql, testDb } from "@/tests/_support/database";

type Repositories = {
  friendLinks: IFriendLinksRepository;
  friendRequests: IFriendRequestsRepository;
  friendships: IFriendshipsRepository;
  gameSuggestions: IGameSuggestionsRepository;
  games: IGamesRepository;
  loans: ILoansRepository;
  notices: INoticesRepository;
  removedUsers: IRemovedUsersRepository;
  transactions: ITransactionManagerService;
  userGames: IUserGamesRepository;
  userProfiles: IUserProfilesRepository;
  userSettings: IUserSettingsRepository;
};

function mockRepositories(): Repositories {
  // The copies' mock reads friendships as the real repository's join does, and the requests'
  // mock takes a request's notice with it, as the table's cascade does.
  const friendships = new MockFriendshipsRepository();
  const notices = new MockNoticesRepository();
  return {
    friendLinks: new MockFriendLinksRepository(),
    friendRequests: new MockFriendRequestsRepository(notices),
    friendships,
    gameSuggestions: new MockGameSuggestionsRepository(),
    games: new MockGamesRepository(),
    loans: new MockLoansRepository(),
    notices,
    removedUsers: new MockRemovedUsersRepository(),
    transactions: new MockTransactionManagerService(),
    userGames: new MockUserGamesRepository(friendships),
    userProfiles: new MockUserProfilesRepository(),
    userSettings: new MockUserSettingsRepository(),
  };
}

// The real repositories, over the PGlite test database (see preload.ts).
export function postgresRepositories(): Repositories {
  const log = new MockLoggerService();
  return {
    friendLinks: new FriendLinksRepository(log),
    friendRequests: new FriendRequestsRepository(log),
    friendships: new FriendshipsRepository(log),
    gameSuggestions: new GameSuggestionsRepository(log),
    games: new GamesRepository(log),
    loans: new LoansRepository(log),
    notices: new NoticesRepository(log),
    removedUsers: new RemovedUsersRepository(log),
    transactions: new TransactionManagerService(log),
    userGames: new UserGamesRepository(log),
    userProfiles: new UserProfilesRepository(log),
    userSettings: new UserSettingsRepository(log),
  };
}

type Backend = {
  name: string;
  reset: () => Promise<void>;
  repositories: () => Repositories;
};
const MOCK: Backend = {
  name: "mock",
  reset: async () => {},
  repositories: mockRepositories,
};
const POSTGRES: Backend = {
  name: "postgres",
  reset: resetDatabase,
  repositories: postgresRepositories,
};
// Outside describeEachBackend, makeApp() uses the mocks.
let currentBackend = MOCK;

// Runs the block once per backend. Inside it, makeApp() uses that backend's repositories,
// and the database is emptied before each test. A test that passes on "mock" but fails
// on "postgres" means the mock has drifted from the real SQL.
export function describeEachBackend(name: string, fn: () => void): void {
  for (const backend of [MOCK, POSTGRES]) {
    describe(`${name} [${backend.name}]`, () => {
      beforeEach(async () => {
        currentBackend = backend;
        await backend.reset();
      });
      fn();
    });
  }
}

export function makeApp(repos: Repositories = currentBackend.repositories()) {
  const {
    friendLinks,
    friendRequests,
    friendships,
    gameSuggestions,
    games,
    loans,
    notices,
    removedUsers,
    transactions,
    userGames,
    userProfiles,
    userSettings,
  } = repos;
  const storage = new MockFileStorageService();
  const log = new MockLoggerService();
  // You is the admin, as on the canvas's E5.
  const adminAccount = { adminUserId: CAST.people.you.id };
  const admin = requireAdmin(adminAccount, log);

  return {
    repos,
    // What the photo steps stored, by bucket and key.
    files: storage.files,

    // Profile
    createProfile: createProfileUseCase(
      userProfiles,
      userSettings,
      transactions,
      log,
    ),
    updateProfile: updateProfileUseCase(userProfiles, transactions, log),
    getProfile: getProfileUseCase(userProfiles, friendships, storage),
    getAccountState: getAccountStateUseCase(removedUsers, userProfiles),
    listTakenPieces: listTakenPiecesUseCase(friendships, userProfiles),
    setPhoto: setPhotoUseCase(userProfiles, storage, transactions, log),
    removePhoto: removePhotoUseCase(userProfiles, storage, transactions, log),

    // Catalog
    getGame: getGameUseCase(games, userGames, loans, userProfiles),
    searchGames: searchGamesUseCase(games, userGames, loans, userProfiles),

    // Copies
    addUserGame: addUserGameUseCase(
      games,
      userGames,
      userSettings,
      transactions,
      log,
    ),
    updateUserGame: updateUserGameUseCase(games, userGames, transactions, log),
    putInBox: putInBoxUseCase(games, userGames, transactions, log),
    setLending: setLendingUseCase(userGames, transactions, log),
    setPassAlongForAll: setPassAlongForAllUseCase(
      userGames,
      userSettings,
      transactions,
      log,
    ),
    removeUserGame: removeUserGameUseCase(
      games,
      userGames,
      loans,
      transactions,
      log,
    ),
    listLibrary: listLibraryUseCase(
      games,
      userGames,
      loans,
      userProfiles,
      friendships,
    ),
    listMyLibrary: listMyLibraryUseCase(
      games,
      userGames,
      loans,
      userProfiles,
      userSettings,
      friendships,
      gameSuggestions,
    ),
    getUserGame: getUserGameUseCase(games, userGames, loans, userProfiles),

    // Suggestions and the admin's catalog (U9)
    suggestGame: suggestGameUseCase(
      gameSuggestions,
      notices,
      storage,
      transactions,
      adminAccount,
      log,
    ),
    listSuggestions: listSuggestionsUseCase(
      admin,
      gameSuggestions,
      userProfiles,
    ),
    listAnsweredSuggestions: listAnsweredSuggestionsUseCase(
      admin,
      gameSuggestions,
      userProfiles,
      games,
    ),
    getSuggestion: getSuggestionUseCase(
      admin,
      gameSuggestions,
      userProfiles,
      games,
    ),
    answerSuggestion: answerSuggestionUseCase(
      admin,
      gameSuggestions,
      games,
      userGames,
      userSettings,
      notices,
      transactions,
      log,
    ),
    addGame: addGameUseCase(
      admin,
      games,
      gameSuggestions,
      userGames,
      userSettings,
      notices,
      storage,
      transactions,
      log,
    ),
    updateGame: updateGameUseCase(admin, games, storage, transactions, log),
    findGamesToEdit: findGamesToEditUseCase(admin, games),
    getGameToEdit: getGameToEditUseCase(admin, games),
    // What a member was told: the notices mock's rows, or the table's on PGlite.
    noticesOf: async (userId: string) =>
      notices instanceof MockNoticesRepository
        ? notices.rows.filter((notice) => notice.userId === userId)
        : (await testDb.select().from(noticesTable)).filter(
            (notice) => notice.userId === userId,
          ),

    requireFriend: (viewerId: string, otherUserId: string) =>
      requireFriend(friendships, viewerId, otherUserId),

    // Requests and their answers (U12)
    requestLoan: requestLoanUseCase(
      friendships,
      userGames,
      loans,
      notices,
      transactions,
      log,
    ),
    withdrawRequest: withdrawRequestUseCase(
      userGames,
      loans,
      notices,
      transactions,
      log,
    ),
    answerRequest: answerRequestUseCase(
      userGames,
      loans,
      notices,
      transactions,
      log,
    ),
    cancelLoan: cancelLoanUseCase(userGames, loans, notices, transactions, log),

    // More time, due dates and calling back (U14)
    askMoreTime: askMoreTimeUseCase(
      userGames,
      loans,
      notices,
      transactions,
      log,
    ),
    answerMoreTime: answerMoreTimeUseCase(
      userGames,
      loans,
      notices,
      transactions,
      log,
    ),
    changeDueDate: changeDueDateUseCase(
      userGames,
      loans,
      notices,
      transactions,
      log,
    ),
    callBack: callBackUseCase(userGames, loans, notices, transactions, log),

    // The pick-up and the return (U13)
    confirmPickUp: confirmPickUpUseCase(userGames, loans, transactions, log),
    giveBack: giveBackUseCase(userGames, loans, notices, transactions, log),
    confirmReturn: confirmReturnUseCase(
      userGames,
      loans,
      notices,
      transactions,
      log,
    ),
    listLoans: listLoansUseCase(loans, userGames, games, userProfiles),

    // Recording a loan, and past loans (U16)
    recordLoan: recordLoanUseCase(
      friendships,
      userGames,
      loans,
      notices,
      transactions,
      log,
    ),
    listPastLoans: listPastLoansUseCase(loans, userGames, games, userProfiles),
    getRecordLoanChoices: getRecordLoanChoicesUseCase(
      userGames,
      loans,
      games,
      friendships,
      userProfiles,
    ),

    // Lines and passing it along (U15)
    passAlong: passAlongUseCase(userGames, loans, notices, transactions, log),
    confirmPassAlong: confirmPassAlongUseCase(
      userGames,
      loans,
      notices,
      transactions,
      log,
    ),
    takeBackPassAlong: takeBackPassAlongUseCase(
      userGames,
      loans,
      notices,
      transactions,
      log,
    ),
    getLoan: getLoanUseCase(loans, userGames, games, userProfiles),

    // The inbox, the counts and notice settings (U11)
    listInbox: listInboxUseCase(
      notices,
      userSettings,
      loans,
      userGames,
      games,
      gameSuggestions,
      userProfiles,
    ),
    markInboxRead: markInboxReadUseCase(notices, transactions),
    getTabCounts: getTabCountsUseCase(
      notices,
      userSettings,
      userGames,
      loans,
      friendRequests,
    ),
    getNoticeSettings: getNoticeSettingsUseCase(userSettings),
    updateNoticeSettings: updateNoticeSettingsUseCase(
      userSettings,
      transactions,
      log,
    ),

    // Friends (U10)
    getFriendLink: getFriendLinkUseCase(friendLinks, transactions, log),
    makeFriendLink: makeFriendLinkUseCase(friendLinks, transactions, log),
    checkFriendLink: checkFriendLinkUseCase(friendLinks),
    openFriendLink: openFriendLinkUseCase(
      friendLinks,
      friendships,
      friendRequests,
      userProfiles,
      transactions,
      log,
    ),
    listFriends: listFriendsUseCase(
      friendships,
      friendRequests,
      userProfiles,
      userGames,
    ),
    listPeopleYouMayKnow: listPeopleYouMayKnowUseCase(
      friendships,
      friendRequests,
      userProfiles,
    ),
    getFriend: getFriendUseCase(
      friendships,
      userProfiles,
      userGames,
      games,
      loans,
      storage,
    ),
    sendFriendRequest: sendFriendRequestUseCase(
      friendships,
      friendRequests,
      notices,
      transactions,
      log,
    ),
    answerFriendRequest: answerFriendRequestUseCase(
      friendships,
      friendRequests,
      transactions,
      log,
    ),
    cancelFriendRequest: cancelFriendRequestUseCase(
      friendRequests,
      transactions,
      log,
    ),
    unfriend: unfriendUseCase(
      friendships,
      friendRequests,
      userGames,
      loans,
      transactions,
      log,
    ),

    // Fixtures

    // The design canvas's cast (tests/_support/cast.ts), each member as the cast's own id. Its
    // people go through the repositories that write them. On the database the rest go in
    // through drizzle; a mock gets what its reads need: the games, the copies with their boxes,
    // and the loans.
    async makeCast(): Promise<void> {
      const rows = castRows();
      await transactions.startTransaction(async (tx) => {
        await writeCastPeople(rows, repos, tx, { commit: true });
        if (
          games instanceof MockGamesRepository &&
          userGames instanceof MockUserGamesRepository &&
          loans instanceof MockLoansRepository
        ) {
          games.rows.push(...rows.games);
          userGames.rows.push(...rows.copies);
          userGames.expansions.push(...rows.expansions);
          loans.rows.push(...rows.loans);
        } else {
          await insertCastRows(rows, tx, { commit: true });
        }
      });
    },

    // Games the cast doesn't have, such as one with a popularity, until U9 gives the catalog its
    // writes.
    async addGames(...rows: Game[]): Promise<void> {
      if (games instanceof MockGamesRepository) {
        games.rows.push(...rows);
      } else {
        await testDb.insert(gamesTable).values(rows);
      }
    },

    // Copies the cast doesn't have, such as a stranger's, until U7 gives copies their writes.
    async addCopies(...rows: UserGame[]): Promise<void> {
      if (userGames instanceof MockUserGamesRepository) {
        userGames.rows.push(...rows);
      } else {
        await testDb.insert(userGamesTable).values(rows);
      }
    },

    // An account the admin removed (G8), until U22 adds the removal.
    async addRemovedUser(userId: string): Promise<void> {
      if (removedUsers instanceof MockRemovedUsersRepository) {
        removedUsers.userIds.add(userId);
      } else {
        await sql("insert into removed_users (user_id) values ($1)", [userId]);
      }
    },
  };
}
