import type { StampTone } from "@/app/_components/stamp";
import type { InboxNotice } from "@/src/entities/models/notice.model";
import type { NoticeType } from "@/src/entities/notice-types";

// What the inbox shows for one notice (F1): its line, a second line when there's more to say, the
// page it opens, and a stamp when it waits on the member.
export type NoticeWords = {
  line: string;
  detail: string | null;
  href: string;
  stamp: { word: string; tone: StampTone } | null;
};

// Who's reading, and their today (KTD9), for "You have it until Friday".
export type NoticeReader = { userId: string; today: string };

export type NoticeTexts<Type extends NoticeType> = Record<
  Type,
  (item: InboxNotice, reader: NoticeReader) => NoticeWords
>;

// Who did it, by name; a member who has left reads as Someone.
export const actorOf = (item: InboxNotice) => item.actor?.name ?? "Someone";

// A note a member typed, quoted as they wrote it (data-model.md, notices.answer_note).
export const quoted = (note: string | null | undefined) =>
  note ? `“${note}”` : null;

export const words = (
  line: string,
  href: string,
  more: Partial<Pick<NoticeWords, "detail" | "stamp">> = {},
): NoticeWords => ({
  line,
  href,
  detail: more.detail ?? null,
  stamp: more.stamp ?? null,
});
