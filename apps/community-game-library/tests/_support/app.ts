// Every use case wired to one set of repositories, plus the design canvas's cast, so a test reads
// like the feature. Inside describeEachBackend the same tests run twice: on the in-memory mocks
// and on the real repositories (PGlite). Recipes' harness: each unit adds its repositories and
// use cases here.
import { beforeEach, describe } from "bun:test";
import { games as gamesTable, userGames as userGamesTable } from "@/db/schema";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IRemovedUsersRepository } from "@/src/application/repositories/removed-users.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { getGameUseCase } from "@/src/application/use-cases/catalog/get-game.use-case";
import { searchGamesUseCase } from "@/src/application/use-cases/catalog/search-games.use-case";
import { requireFriend } from "@/src/application/use-cases/friends/require-friend";
import { createProfileUseCase } from "@/src/application/use-cases/profile/create-profile.use-case";
import { getAccountStateUseCase } from "@/src/application/use-cases/profile/get-account-state.use-case";
import { getProfileUseCase } from "@/src/application/use-cases/profile/get-profile.use-case";
import { listTakenPiecesUseCase } from "@/src/application/use-cases/profile/list-taken-pieces.use-case";
import { removePhotoUseCase } from "@/src/application/use-cases/profile/remove-photo.use-case";
import { setPhotoUseCase } from "@/src/application/use-cases/profile/set-photo.use-case";
import { updateProfileUseCase } from "@/src/application/use-cases/profile/update-profile.use-case";
import type { Game } from "@/src/entities/models/game.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import { FriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository";
import { MockFriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository.mock";
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
  castRows,
  insertCastRows,
  writeCastPeople,
} from "@/tests/_support/cast";
import { resetDatabase, sql, testDb } from "@/tests/_support/database";

type Repositories = {
  friendships: IFriendshipsRepository;
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
  // The copies' mock reads friendships as the real repository's join does.
  const friendships = new MockFriendshipsRepository();
  return {
    friendships,
    games: new MockGamesRepository(),
    loans: new MockLoansRepository(),
    notices: new MockNoticesRepository(),
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
    friendships: new FriendshipsRepository(log),
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
    friendships,
    games,
    loans,
    removedUsers,
    transactions,
    userGames,
    userProfiles,
    userSettings,
  } = repos;
  const storage = new MockFileStorageService();
  const log = new MockLoggerService();

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

    requireFriend: (viewerId: string, otherUserId: string) =>
      requireFriend(friendships, viewerId, otherUserId),

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
