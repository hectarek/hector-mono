import { describe, expect, it } from "bun:test";
import { noticeText } from "@/app/_lib/notice-text";
import type { InboxNotice, Notice } from "@/src/entities/models/notice.model";
import { NOTICE_TYPES, type NoticeType } from "@/src/entities/notice-types";

const YOU = "00000000-0000-4000-8000-000000000001";
const SAM = "00000000-0000-4000-8000-000000000003";
const at = new Date("2026-11-10T09:00:00-05:00");
const reader = { userId: YOU, today: "2026-11-10" };

const notice = (type: NoticeType): Notice => ({
  id: "00000000-0000-4000-8000-00000000f001",
  userId: YOU,
  type,
  createdBy: SAM,
  loanId: null,
  gameNightId: null,
  gameSuggestionId: null,
  friendRequestId: null,
  answerNote: "Out of town until Thursday.",
  remindedOn: null,
  readAt: null,
  createdAt: at,
  updatedAt: at,
});

// Every type with the rows it points at, as the inbox reads them.
const item = (type: NoticeType): InboxNotice => ({
  notice: notice(type),
  actor: { userId: SAM, name: "Sam", pieceShape: "house", pieceColor: "ocean" },
  loan: {
    id: "00000000-0000-4000-8000-00000000c001",
    gameId: "00000000-0000-4000-8000-00000000b001",
    gameTitle: "Moss & Mortar",
    ownerId: SAM,
    borrowerId: YOU,
    borrowerName: "Robin Vale",
    requestNote: "Can I grab it Friday?",
    dueOn: "2026-11-13",
    moreTimeDueOn: "2026-11-20",
  },
  night: {
    id: "00000000-0000-4000-8000-00000000d001",
    title: "Saturday game night",
    startsAt: new Date("2026-11-14T19:00:00-05:00"),
  },
  suggestion: {
    id: "00000000-0000-4000-8000-00000000e001",
    title: "Pocket Regatta",
    status: "added",
    gameId: "00000000-0000-4000-8000-00000000b002",
  },
});

const AREA_ROUTES: [RegExp, RegExp][] = [
  [
    /^(loan|line|request|turn|return|pass|passed|more|due|called|overdue)/,
    /^\/loans\/[0-9a-f-]{36}$/,
  ],
  [/^(night|waitlist|removed-from-waitlist)/, /^\/nights\/[0-9a-f-]{36}$/],
  [/^friend-request$/, /^\/friends$/],
  [/^suggestion-answered$/, /^\/games\/[0-9a-f-]{36}$/],
  [/^suggestion-arrived$/, /^\/admin\/suggestions\/[0-9a-f-]{36}$/],
];

// data-model.md's 31 types (U11): each gives a line and opens its thing's page.
describe("noticeText", () => {
  it("knows all 31 types", () => {
    expect(NOTICE_TYPES).toHaveLength(31);
  });

  for (const type of NOTICE_TYPES) {
    it(`words ${type} and links it to its page`, () => {
      const words = noticeText(item(type), reader);
      expect(words.line.length).toBeGreaterThan(0);
      expect(words.line).not.toContain("undefined");
      // F1 sets part of the line in bold.
      expect(words.bold.length).toBeGreaterThan(0);
      expect(words.line).toContain(words.bold);
      expect(words.detail ?? "").not.toContain("undefined");
      const route = AREA_ROUTES.find(([types]) => types.test(type))?.[1];
      expect(route).toBeDefined();
      expect(words.href).toMatch(route ?? /^$/);
    });
  }

  it("says F1's lines for a request, more time and a friend", () => {
    expect(noticeText(item("loan-requested"), reader)).toMatchObject({
      line: "Sam asked to borrow Moss & Mortar",
      bold: "Sam asked to borrow",
      detail: "“Can I grab it Friday?”",
      stamp: { word: "Requested", tone: "red" },
    });
    expect(noticeText(item("more-time-asked"), reader)).toMatchObject({
      line: "Sam asked for more time on Moss & Mortar",
      bold: "Sam asked for more time",
      detail: "Until Fri, Nov 20",
    });
    expect(noticeText(item("friend-request"), reader)).toMatchObject({
      line: "Sam wants to be friends",
      bold: "Sam wants",
      href: "/friends",
    });
    // A line about a thing alone bolds what happened to it.
    expect(noticeText(item("due-today"), reader)).toMatchObject({
      line: "Moss & Mortar is due today",
      bold: "is due today",
    });
    expect(noticeText(item("line-joined"), reader).detail).toBe(
      "You have it until Friday. Your due date doesn’t change.",
    );
  });

  it("names someone who has left as Someone, and opens a list when its thing has gone", () => {
    const gone = { ...item("loan-requested"), actor: null, loan: null };
    expect(noticeText(gone, reader)).toMatchObject({
      line: "Someone asked to borrow a game",
      href: "/loans",
    });
  });
});
