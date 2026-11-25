import {
  actorOf,
  did,
  happened,
  type NoticeTexts,
  quoted,
  words,
} from "@/app/_lib/notice-text/words";
import type { InboxNotice } from "@/src/entities/models/notice.model";
import {
  formatDate,
  formatTime,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";

type NightType =
  | "night-invite"
  | "night-changed"
  | "night-cancelled"
  | "waitlist-seat"
  | "removed-from-waitlist"
  | "night-today";

// A night's notice opens the night (D2); one whose night has gone opens Nights.
const hrefOf = (item: InboxNotice) =>
  item.night ? `/nights/${item.night.id}` : "/nights";
const titleOf = (item: InboxNotice) => item.night?.title ?? "a game night";
// "Sat, Nov 14 · 7:00 PM"
const whenOf = (item: InboxNotice, today: string) =>
  item.night
    ? `${formatDate(todayIn(PLAN_TIME_ZONE, item.night.startsAt), today)} · ${formatTime(item.night.startsAt)}`
    : null;

// The nights' notices (R26, R31, R34), in F1's words.
export const NIGHT_TEXTS: NoticeTexts<NightType> = {
  "night-invite": (item, reader) =>
    words(
      did(`${actorOf(item)} invited you`, `to ${titleOf(item)}`),
      hrefOf(item),
      {
        detail: whenOf(item, reader.today),
        stamp: { word: "Invited", tone: "red" },
      },
    ),
  "night-changed": (item, reader) =>
    words(happened(titleOf(item), "changed"), hrefOf(item), {
      detail: whenOf(item, reader.today),
    }),
  "night-cancelled": (item) =>
    words(happened(titleOf(item), "is cancelled"), hrefOf(item), {
      detail: quoted(item.notice.answerNote),
    }),
  "waitlist-seat": (item, reader) =>
    words(did("A seat opened for you", `at ${titleOf(item)}`), hrefOf(item), {
      detail: whenOf(item, reader.today),
    }),
  "removed-from-waitlist": (item) =>
    words(
      did(`${actorOf(item)} took you off the waitlist`, `for ${titleOf(item)}`),
      hrefOf(item),
    ),
  "night-today": (item) =>
    words(happened(titleOf(item), "is today"), hrefOf(item), {
      detail: item.night ? formatTime(item.night.startsAt) : null,
    }),
};
