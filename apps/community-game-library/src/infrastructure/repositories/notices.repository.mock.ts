import {
  INBOX_LIMIT,
  type INoticesRepository,
} from "@/src/application/repositories/notices.repository.interface";
import type { NewNotice, Notice } from "@/src/entities/models/notice.model";
import type { NoticeType } from "@/src/entities/notice-types";

const newestFirst = (a: Notice, b: Notice) =>
  b.createdAt.getTime() - a.createdAt.getTime() ||
  (b.id < a.id ? -1 : b.id > a.id ? 1 : 0);

export class MockNoticesRepository implements INoticesRepository {
  // What it was given; tests and the cast put rows in here too.
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

  async addReminder(
    notice: NewNotice & { remindedOn: string },
  ): Promise<boolean> {
    // As notices_one_reminder_a_day_idx.
    const about = notice.loanId ?? notice.gameNightId ?? null;
    if (
      this.rows.some(
        (row) =>
          row.userId === notice.userId &&
          row.type === notice.type &&
          (row.loanId ?? row.gameNightId) === about &&
          row.remindedOn === notice.remindedOn,
      )
    ) {
      return false;
    }
    const created = await this.add(notice);
    const row = this.rows.find((one) => one.id === created.id);
    if (row) {
      row.remindedOn = notice.remindedOn;
    }
    return true;
  }

  async listForUser(userId: string): Promise<Notice[]> {
    return this.rows
      .filter((row) => row.userId === userId)
      .sort(newestFirst)
      .slice(0, INBOX_LIMIT)
      .map((row) => ({ ...row }));
  }

  async countUnread(
    userId: string,
    types: readonly NoticeType[],
  ): Promise<number> {
    return this.rows.filter(
      (row) =>
        row.userId === userId &&
        row.readAt === null &&
        types.includes(row.type),
    ).length;
  }

  async markRead(userId: string, noticeIds: readonly string[]): Promise<void> {
    const now = new Date();
    for (const row of this.rows) {
      if (
        row.userId === userId &&
        noticeIds.includes(row.id) &&
        row.readAt === null
      ) {
        Object.assign(row, { readAt: now, updatedAt: now });
      }
    }
  }
}
