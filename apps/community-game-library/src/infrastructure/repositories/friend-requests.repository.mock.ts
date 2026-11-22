import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { FriendRequest } from "@/src/entities/models/friend-request.model";
import type { MockNoticesRepository } from "@/src/infrastructure/repositories/notices.repository.mock";

const isBetween = (row: FriendRequest, userId: string, otherUserId: string) =>
  (row.createdBy === userId && row.recipientUserId === otherUserId) ||
  (row.createdBy === otherUserId && row.recipientUserId === userId);

export class MockFriendRequestsRepository implements IFriendRequestsRepository {
  // Public, so the cast and tests can put requests in, as the seed does.
  readonly rows: FriendRequest[] = [];

  // The notices' mock, when there is one, loses a request's notice with it, as the table's
  // cascade does.
  constructor(private readonly notices?: MockNoticesRepository) {}

  private dropNotices(requestIds: string[]) {
    const rows = this.notices?.rows;
    for (let index = (rows?.length ?? 0) - 1; index >= 0; index -= 1) {
      const id = rows?.[index]?.friendRequestId;
      if (id && requestIds.includes(id)) {
        rows?.splice(index, 1);
      }
    }
  }

  async add(
    request: Pick<FriendRequest, "createdBy" | "recipientUserId">,
  ): Promise<FriendRequest> {
    // As the table's one-per-pair index.
    if (
      this.rows.some((row) =>
        isBetween(row, request.createdBy, request.recipientUserId),
      )
    ) {
      throw new DatabaseOperationError("add failed");
    }
    const now = new Date();
    const row: FriendRequest = {
      id: crypto.randomUUID(),
      ...request,
      status: "waiting",
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return { ...row };
  }

  async getById(id: string): Promise<FriendRequest | undefined> {
    const row = this.rows.find((request) => request.id === id);
    return row && { ...row };
  }

  async getBetween(
    userId: string,
    otherUserId: string,
  ): Promise<FriendRequest | undefined> {
    const row = this.rows.find((request) =>
      isBetween(request, userId, otherUserId),
    );
    return row && { ...row };
  }

  async listInvolving(userId: string): Promise<FriendRequest[]> {
    return this.rows
      .filter(
        (row) => row.createdBy === userId || row.recipientUserId === userId,
      )
      .sort(
        (a, b) =>
          a.createdAt.getTime() - b.createdAt.getTime() ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )
      .map((row) => ({ ...row }));
  }

  async decline(id: string): Promise<void> {
    const row = this.rows.find((request) => request.id === id);
    if (row) {
      Object.assign(row, { status: "declined", updatedAt: new Date() });
    }
  }

  async remove(id: string): Promise<void> {
    const index = this.rows.findIndex((request) => request.id === id);
    if (index !== -1) {
      this.rows.splice(index, 1);
      this.dropNotices([id]);
    }
  }

  async removeBetween(userId: string, otherUserId: string): Promise<void> {
    for (let index = this.rows.length - 1; index >= 0; index -= 1) {
      const row = this.rows[index];
      if (row && isBetween(row, userId, otherUserId)) {
        this.rows.splice(index, 1);
        this.dropNotices([row.id]);
      }
    }
  }
}
