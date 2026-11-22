import { describe, expect, it } from "bun:test";
import {
  DEFAULT_NOTICES_OFF,
  NOTICE_GROUPS,
  NOTICE_TYPE_GROUPS,
  NOTICE_TYPES,
} from "@/src/entities/notice-types";

describe("notice types", () => {
  it("has data-model.md's 31 types, each once", () => {
    expect(NOTICE_TYPES).toHaveLength(31);
    expect(new Set(NOTICE_TYPES).size).toBe(31);
  });

  it("gives every type a group of E7's or none, and nothing else", () => {
    expect(Object.keys(NOTICE_TYPE_GROUPS)).toEqual([...NOTICE_TYPES]);
    for (const group of Object.values(NOTICE_TYPE_GROUPS)) {
      expect(group === null || NOTICE_GROUPS.includes(group)).toBe(true);
    }
  });

  it("puts the groups in E7's order, each with a type in it", () => {
    expect(NOTICE_GROUPS).toEqual([
      "due-date-reminders",
      "overdue-reminders",
      "requests-on-my-games",
      "answers-to-my-requests",
      "line-updates",
      "pick-ups-and-returns",
      "more-time-requests",
      "friend-requests",
      "night-invites",
      "night-changes",
      "waitlist-seats",
      "night-mornings",
      "suggestion-answers",
    ]);
    const used = new Set(Object.values(NOTICE_TYPE_GROUPS));
    for (const group of NOTICE_GROUPS) {
      expect(used.has(group)).toBe(true);
    }
  });

  it("files the reminders and the night's morning where E7 does", () => {
    expect(NOTICE_TYPE_GROUPS["due-soon"]).toBe("due-date-reminders");
    expect(NOTICE_TYPE_GROUPS["due-today"]).toBe("due-date-reminders");
    expect(NOTICE_TYPE_GROUPS["due-back-today"]).toBe("due-date-reminders");
    expect(NOTICE_TYPE_GROUPS.overdue).toBe("overdue-reminders");
    expect(NOTICE_TYPE_GROUPS["night-today"]).toBe("night-mornings");
  });

  it("always shows the eleven types with no group", () => {
    expect(
      NOTICE_TYPES.filter((type) => NOTICE_TYPE_GROUPS[type] === null),
    ).toEqual([
      "request-withdrawn",
      "loan-cancelled",
      "loan-recorded",
      "return-not-confirmed",
      "return-closed",
      "pass-along-taken-back",
      "passed-along",
      "due-date-changed",
      "called-back",
      "removed-from-waitlist",
      "suggestion-arrived",
    ]);
  });

  it("starts a new member with only the morning-of-a-night reminder off", () => {
    expect(DEFAULT_NOTICES_OFF).toEqual(["night-mornings"]);
  });
});
