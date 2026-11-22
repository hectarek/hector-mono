import type { IRemovedUsersRepository } from "@/src/application/repositories/removed-users.repository.interface";

export class MockRemovedUsersRepository implements IRemovedUsersRepository {
  // The removed accounts its read sees. Tests put them here (addRemovedUser,
  // tests/_support/app.ts) until U22 adds the removal.
  readonly userIds = new Set<string>();

  async isRemoved(userId: string): Promise<boolean> {
    return this.userIds.has(userId);
  }
}
