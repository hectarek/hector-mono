import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { NewNotice, Notice } from "@/src/entities/models/notice.model";

export class MockNoticesRepository implements INoticesRepository {
  // What it was given, which tests read until U11 adds the inbox's reads.
  readonly rows: Notice[] = [];

  async add(notice: NewNotice): Promise<Notice> {
    const now = new Date();
    const created: Notice = {
      id: crypto.randomUUID(),
      userId: notice.userId,
      type: notice.type,
      createdBy: notice.createdBy ?? null,
      loanId: notice.loanId ?? null,
      gameNightId: notice.gameNightId ?? null,
      gameSuggestionId: notice.gameSuggestionId ?? null,
      friendRequestId: notice.friendRequestId ?? null,
      answerNote: notice.answerNote ?? null,
      remindedOn: null,
      readAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(created);
    return { ...created };
  }
}
