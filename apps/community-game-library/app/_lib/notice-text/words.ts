import type { StampTone } from "@/app/_components/stamp";
import type { InboxNotice } from "@/src/entities/models/notice.model";
import type { NoticeType } from "@/src/entities/notice-types";

// What the inbox shows for one notice (F1): its line, a second line when there's more to say, the
// page it opens, and a stamp when it waits on the member.
export type NoticeWords = {
  line: string;
  // The line's words in bold, as F1 sets them: who did what ("Priya asked to borrow" Night
  // Market), or for a line about a thing alone, what happened to it (Moss & Mortar "is due
  // today").
  bold: string;
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

type Said = Pick<NoticeWords, "line" | "bold">;

// Someone did something, in bold, then what it was about: did("Priya asked to borrow", "Night
// Market").
export const did = (who: string, about: string): Said => ({
  line: `${who} ${about}`,
  bold: who,
});

// A thing, then what happened to it, in bold: happened("Moss & Mortar", "is due today").
export const happened = (thing: string, what: string): Said => ({
  line: `${thing} ${what}`,
  bold: what,
});

export const words = (
  { line, bold }: Said,
  href: string,
  more: Partial<Pick<NoticeWords, "detail" | "stamp">> = {},
): NoticeWords => ({
  line,
  bold,
  href,
  detail: more.detail ?? null,
  stamp: more.stamp ?? null,
});
