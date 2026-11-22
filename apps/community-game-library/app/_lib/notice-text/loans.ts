import {
  actorOf,
  type NoticeTexts,
  quoted,
  words,
} from "@/app/_lib/notice-text/words";
import type { InboxNotice } from "@/src/entities/models/notice.model";
import { formatDate, formatDayName } from "@/src/entities/week";

type LoanType =
  | "loan-requested"
  | "line-joined"
  | "request-withdrawn"
  | "request-accepted"
  | "request-declined"
  | "turn-in-line"
  | "loan-cancelled"
  | "loan-recorded"
  | "return-to-confirm"
  | "return-not-confirmed"
  | "return-closed"
  | "pass-along-to-confirm"
  | "pass-along-taken-back"
  | "passed-along"
  | "more-time-asked"
  | "more-time-answered"
  | "due-date-changed"
  | "called-back"
  | "due-soon"
  | "due-today"
  | "due-back-today"
  | "overdue";

// A loan's notice opens the loan's page (C2 to C18); one whose loan has gone opens Loans.
const hrefOf = (item: InboxNotice) =>
  item.loan ? `/loans/${item.loan.id}` : "/loans";
const gameOf = (item: InboxNotice) => item.loan?.gameTitle ?? "a game";
const borrowerOf = (item: InboxNotice) =>
  item.loan?.borrowerName ?? "Your friend";
const note = (item: InboxNotice) => quoted(item.notice.answerNote);

const RED = { tone: "red" } as const;

// The loans' notices (R16 to R26, R48; data-model.md, notices), in F1's words.
export const LOAN_TEXTS: NoticeTexts<LoanType> = {
  "loan-requested": (item) =>
    words(`${actorOf(item)} asked to borrow ${gameOf(item)}`, hrefOf(item), {
      detail: quoted(item.loan?.requestNote),
      stamp: { word: "Requested", ...RED },
    }),
  "line-joined": (item, reader) =>
    words(
      `${actorOf(item)} joined the line for ${gameOf(item)}`,
      hrefOf(item),
      {
        detail:
          item.loan?.borrowerId === reader.userId && item.loan.dueOn
            ? `You have it until ${formatDayName(item.loan.dueOn)}. Your due date doesn’t change.`
            : null,
      },
    ),
  "request-withdrawn": (item) =>
    words(
      `${actorOf(item)} withdrew their request for ${gameOf(item)}`,
      hrefOf(item),
    ),
  "request-accepted": (item) =>
    words(`${actorOf(item)} said yes to ${gameOf(item)}`, hrefOf(item), {
      detail: "Pick it up, then say you have it.",
    }),
  "request-declined": (item) =>
    words(`${actorOf(item)} said no to ${gameOf(item)}`, hrefOf(item), {
      detail: note(item),
    }),
  "turn-in-line": (item) =>
    words(`You’re next in line for ${gameOf(item)}`, hrefOf(item)),
  "loan-cancelled": (item) =>
    words(`${actorOf(item)} called off ${gameOf(item)}`, hrefOf(item), {
      detail: note(item),
    }),
  "loan-recorded": (item, reader) =>
    words(`${actorOf(item)} lent you ${gameOf(item)}`, hrefOf(item), {
      detail: item.loan?.dueOn
        ? `It’s due ${formatDate(item.loan.dueOn, reader.today)}.`
        : null,
    }),
  "return-to-confirm": (item) =>
    words(`${borrowerOf(item)} gave back ${gameOf(item)}`, hrefOf(item), {
      detail: "Say whether you have it.",
      stamp: { word: "Confirm", ...RED },
    }),
  "return-not-confirmed": (item) =>
    words(
      `${actorOf(item)} doesn’t have ${gameOf(item)} back yet`,
      hrefOf(item),
    ),
  "return-closed": (item) =>
    words(`${gameOf(item)} counts as back`, hrefOf(item), {
      detail: "A week went by with no answer, so its return closed.",
    }),
  "pass-along-to-confirm": (item) =>
    words(`${actorOf(item)} is passing ${gameOf(item)} to you`, hrefOf(item), {
      detail: "Say when you have it.",
      stamp: { word: "Confirm", ...RED },
    }),
  "pass-along-taken-back": (item) =>
    words(`${actorOf(item)} still has ${gameOf(item)}`, hrefOf(item), {
      detail: "The pass-along is off for now.",
    }),
  "passed-along": (item) =>
    words(`${borrowerOf(item)} has ${gameOf(item)} now`, hrefOf(item), {
      detail: "It was passed along to them.",
    }),
  "more-time-asked": (item, reader) =>
    words(
      `${actorOf(item)} asked for more time on ${gameOf(item)}`,
      hrefOf(item),
      {
        detail: item.loan?.moreTimeDueOn
          ? `Until ${formatDate(item.loan.moreTimeDueOn, reader.today)}`
          : null,
        stamp: { word: "Asked", ...RED },
      },
    ),
  "more-time-answered": (item) =>
    words(
      `${actorOf(item)} answered your request for more time on ${gameOf(item)}`,
      hrefOf(item),
      { detail: note(item) },
    ),
  "due-date-changed": (item, reader) =>
    words(
      `${actorOf(item)} changed when ${gameOf(item)} is due`,
      hrefOf(item),
      {
        detail: item.loan?.dueOn
          ? `It’s due ${formatDate(item.loan.dueOn, reader.today)}.`
          : null,
      },
    ),
  "called-back": (item) =>
    words(`${actorOf(item)} asked for ${gameOf(item)} back`, hrefOf(item), {
      detail: note(item),
    }),
  "due-soon": (item, reader) =>
    words(`${gameOf(item)} is due in two days`, hrefOf(item), {
      detail: item.loan?.dueOn
        ? `Due ${formatDate(item.loan.dueOn, reader.today)}`
        : null,
    }),
  "due-today": (item) => words(`${gameOf(item)} is due today`, hrefOf(item)),
  "due-back-today": (item) =>
    words(`${gameOf(item)} is due back today`, hrefOf(item), {
      detail: `${borrowerOf(item)} has it.`,
    }),
  overdue: (item, reader) =>
    item.loan?.borrowerId === reader.userId
      ? words(`${gameOf(item)} is overdue`, hrefOf(item), {
          detail: item.loan.dueOn
            ? `It was due ${formatDate(item.loan.dueOn, reader.today)}.`
            : null,
          stamp: { word: "Overdue", tone: "late" },
        })
      : words(
          `${borrowerOf(item)} has ${gameOf(item)} past its due date`,
          hrefOf(item),
          {
            stamp: { word: "Overdue", tone: "late" },
          },
        ),
};
