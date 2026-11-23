import type { IRemovedUsersRepository } from "@/src/application/repositories/removed-users.repository.interface";

export class MockRemovedUsersRepository implements IRemovedUsersRepository {
  // The removed accounts its read sees.
  readonly userIds = new Set<string>();

  async isRemoved(userId: string): Promise<boolean> {
    return this.userIds.has(userId);
  }

  async add(userId: string): Promise<void> {
    this.userIds.add(userId);
  }
}
