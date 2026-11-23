import { describe, expect, it } from "bun:test";
import { loanReminders, returnClosesToday } from "@/src/entities/reminders";

const BORROWER = "borrower";
const OWNER = "owner";
// A loan due on Friday, Nov 13, 2026 (AE3).
const out = {
  status: "out",
  dueOn: "2026-11-13",
  borrowerUserId: BORROWER,
} as const;
const on = (today: string, loan: Parameters<typeof loanReminders>[0] = out) =>
  loanReminders(loan, OWNER, today).map(
    ({ userId, type }) => `${type} to ${userId}`,
  );

describe("the daily run's reminders (KTD8, R25)", () => {
  it("AE3: due-soon on Wednesday, due-today and due-back-today on Friday, and overdue to both from Saturday and every three days after", () => {
    expect(on("2026-11-10")).toEqual([]);
    expect(on("2026-11-11")).toEqual(["due-soon to borrower"]);
    expect(on("2026-11-12")).toEqual([]);
    expect(on("2026-11-13")).toEqual([
      "due-today to borrower",
      "due-back-today to owner",
    ]);
    const overdue = ["overdue to borrower", "overdue to owner"];
    expect(on("2026-11-14")).toEqual(overdue);
    expect(on("2026-11-15")).toEqual([]);
    expect(on("2026-11-16")).toEqual([]);
    expect(on("2026-11-17")).toEqual(overdue);
    expect(on("2026-11-20")).toEqual(overdue);
  });

  it("stops once it's given back or handed on (D15)", () => {
    expect(on("2026-11-14", { ...out, status: "returning" })).toEqual([]);
    expect(on("2026-11-14", { ...out, status: "passing" })).toEqual([]);
  });

  it("closes a return its owner left 7 days, and not before", () => {
    const giving = { status: "returning", returnedOn: "2026-11-03" } as const;
    expect(returnClosesToday(giving, "2026-11-09")).toBe(false);
    expect(returnClosesToday(giving, "2026-11-10")).toBe(true);
    expect(
      returnClosesToday({ ...giving, status: "returned" }, "2026-11-10"),
    ).toBe(false);
  });
});
