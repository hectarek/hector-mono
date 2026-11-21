// Every use case wired to one set of repositories, plus the design canvas's cast, so a test reads
// like the feature. Inside describeEachBackend the same tests run twice: on the in-memory mocks
// and on the real repositories (PGlite). Recipes' harness: each unit adds its repositories and
// use cases here.
import { beforeEach, describe } from "bun:test";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IRemovedUsersRepository } from "@/src/application/repositories/removed-users.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireFriend } from "@/src/application/use-cases/friends/require-friend";
import { createProfileUseCase } from "@/src/application/use-cases/profile/create-profile.use-case";
import { getAccountStateUseCase } from "@/src/application/use-cases/profile/get-account-state.use-case";
import { getProfileUseCase } from "@/src/application/use-cases/profile/get-profile.use-case";
import { listTakenPiecesUseCase } from "@/src/application/use-cases/profile/list-taken-pieces.use-case";
import { removePhotoUseCase } from "@/src/application/use-cases/profile/remove-photo.use-case";
import { setPhotoUseCase } from "@/src/application/use-cases/profile/set-photo.use-case";
import { updateProfileUseCase } from "@/src/application/use-cases/profile/update-profile.use-case";
import { FriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository";
import { MockFriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository.mock";
import { LoansRepository } from "@/src/infrastructure/repositories/loans.repository";
import { MockLoansRepository } from "@/src/infrastructure/repositories/loans.repository.mock";
import { NoticesRepository } from "@/src/infrastructure/repositories/notices.repository";
import { MockNoticesRepository } from "@/src/infrastructure/repositories/notices.repository.mock";
import { RemovedUsersRepository } from "@/src/infrastructure/repositories/removed-users.repository";
import { MockRemovedUsersRepository } from "@/src/infrastructure/repositories/removed-users.repository.mock";
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
import { resetDatabase, sql } from "@/tests/_support/database";

type Repositories = {
  friendships: IFriendshipsRepository;
  loans: ILoansRepository;
  notices: INoticesRepository;
  removedUsers: IRemovedUsersRepository;
  transactions: ITransactionManagerService;
  userProfiles: IUserProfilesRepository;
  userSettings: IUserSettingsRepository;
};

function mockRepositories(): Repositories {
  return {
    friendships: new MockFriendshipsRepository(),
    loans: new MockLoansRepository(),
    notices: new MockNoticesRepository(),
    removedUsers: new MockRemovedUsersRepository(),
    transactions: new MockTransactionManagerService(),
    userProfiles: new MockUserProfilesRepository(),
    userSettings: new MockUserSettingsRepository(),
  };
}

// The real repositories, over the PGlite test database (see preload.ts).
export function postgresRepositories(): Repositories {
  const log = new MockLoggerService();
  return {
    friendships: new FriendshipsRepository(log),
    loans: new LoansRepository(log),
    notices: new NoticesRepository(log),
    removedUsers: new RemovedUsersRepository(log),
    transactions: new TransactionManagerService(log),
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
    loans,
    removedUsers,
    transactions,
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

    requireFriend: (viewerId: string, otherUserId: string) =>
      requireFriend(friendships, viewerId, otherUserId),

    // Fixtures

    // The design canvas's cast (tests/_support/cast.ts), each member as the cast's own id. Its
    // people go through the repositories that write them. On the database the rest go in
    // through drizzle; a mock gets what its reads need, which for now is the loans.
    async makeCast(): Promise<void> {
      const rows = castRows();
      await transactions.startTransaction(async (tx) => {
        await writeCastPeople(rows, repos, tx, { commit: true });
        if (loans instanceof MockLoansRepository) {
          loans.rows.push(...rows.loans);
        } else {
          await insertCastRows(rows, tx, { commit: true });
        }
      });
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
