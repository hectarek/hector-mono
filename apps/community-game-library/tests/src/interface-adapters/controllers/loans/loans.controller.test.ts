import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from "bun:test";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { answerMoreTimeController } from "@/src/interface-adapters/controllers/loans/answer-more-time.controller";
import { answerRequestController } from "@/src/interface-adapters/controllers/loans/answer-request.controller";
import { askMoreTimeController } from "@/src/interface-adapters/controllers/loans/ask-more-time.controller";
import { callBackController } from "@/src/interface-adapters/controllers/loans/call-back.controller";
import { cancelLoanController } from "@/src/interface-adapters/controllers/loans/cancel-loan.controller";
import { changeDueDateController } from "@/src/interface-adapters/controllers/loans/change-due-date.controller";
import { confirmPassAlongController } from "@/src/interface-adapters/controllers/loans/confirm-pass-along.controller";
import { confirmPickUpController } from "@/src/interface-adapters/controllers/loans/confirm-pick-up.controller";
import { confirmReturnController } from "@/src/interface-adapters/controllers/loans/confirm-return.controller";
import { getLoanController } from "@/src/interface-adapters/controllers/loans/get-loan.controller";
import { getRecordLoanChoicesController } from "@/src/interface-adapters/controllers/loans/get-record-loan-choices.controller";
import { giveBackController } from "@/src/interface-adapters/controllers/loans/give-back.controller";
import { listLoansController } from "@/src/interface-adapters/controllers/loans/list-loans.controller";
import { listPastLoansController } from "@/src/interface-adapters/controllers/loans/list-past-loans.controller";
import { passAlongController } from "@/src/interface-adapters/controllers/loans/pass-along.controller";
import { recordLoanController } from "@/src/interface-adapters/controllers/loans/record-loan.controller";
import { requestLoanController } from "@/src/interface-adapters/controllers/loans/request-loan.controller";
import { takeBackPassAlongController } from "@/src/interface-adapters/controllers/loans/take-back-pass-along.controller";
import { withdrawRequestController } from "@/src/interface-adapters/controllers/loans/withdraw-request.controller";
import { CAST } from "@/tests/_support/cast";
import { controllerBasics, ID } from "@/tests/_support/controller";

const { you } = CAST.people;

describe("requestLoanController", () => {
  controllerBasics({
    make: (useCase, logger) => requestLoanController(useCase, logger),
    valid: { userGameId: ID, note: "  Can I grab it Friday?  " },
    calledWith: [
      { userGameId: ID, note: "Can I grab it Friday?", join: false },
      you.id,
    ],
    invalid: {
      "a copy that isn't an id": { userGameId: "harbor", note: "" },
      "a note over 500 characters": { userGameId: ID, note: "x".repeat(501) },
      "joining that isn't a yes or no": { userGameId: ID, join: "yes" },
    },
  });

  it("joins the line when asked to (C10)", async () => {
    const useCase = mock(async () => undefined);
    await requestLoanController(useCase as never, new MockLoggerService())(
      { userGameId: ID, note: "", join: true },
      you.id,
    );
    expect(useCase).toHaveBeenCalledWith(
      { userGameId: ID, note: null, join: true },
      you.id,
    );
  });

  it("sends an empty note as none", async () => {
    const useCase = mock(async () => undefined);
    await requestLoanController(useCase as never, new MockLoggerService())(
      { userGameId: ID, note: "   " },
      you.id,
    );
    expect(useCase).toHaveBeenCalledWith(
      { userGameId: ID, note: null, join: false },
      you.id,
    );
  });
});

describe("withdrawRequestController", () => {
  controllerBasics({
    make: (useCase, logger) => withdrawRequestController(useCase, logger),
    valid: { loanId: ID },
    calledWith: [ID, you.id],
    invalid: { "no loan": {} },
  });
});

describe("cancelLoanController", () => {
  controllerBasics({
    make: (useCase, logger) => cancelLoanController(useCase, logger),
    valid: { loanId: ID },
    calledWith: [ID, you.id],
    invalid: { "a loan that isn't an id": { loanId: "night-market" } },
  });
});

describe("answerRequestController", () => {
  // 8:30 PM on Tue Nov 10 in New York, already Wednesday in UTC: today is Eastern time's (KTD9).
  beforeEach(() => {
    setSystemTime(new Date("2026-11-11T01:30:00Z"));
  });
  afterEach(() => {
    setSystemTime();
  });

  controllerBasics({
    make: (useCase, logger) => answerRequestController(useCase, logger),
    valid: { loanId: ID, answer: "yes", periodDays: 14, note: "" },
    calledWith: [
      ID,
      { answer: "yes", periodDays: 14, note: null },
      you.id,
      "2026-11-10",
    ],
    invalid: {
      "a period that isn't offered": {
        loanId: ID,
        answer: "yes",
        periodDays: 10,
        note: "",
      },
      "a date that isn't one": {
        loanId: ID,
        answer: "yes",
        dueOn: "Friday",
        note: "",
      },
      "an answer it doesn't know": { loanId: ID, answer: "maybe", note: "" },
    },
  });

  it("passes a picked date, and a no with its note", async () => {
    const useCase = mock(async () => undefined);
    const controller = answerRequestController(
      useCase as never,
      new MockLoggerService(),
    );
    await controller(
      { loanId: ID, answer: "yes", dueOn: "2026-11-20", note: "" },
      you.id,
    );
    expect(useCase).toHaveBeenLastCalledWith(
      ID,
      { answer: "yes", dueOn: "2026-11-20", note: null },
      you.id,
      "2026-11-10",
    );
    await controller(
      { loanId: ID, answer: "no", note: " Out of town. " },
      you.id,
    );
    expect(useCase).toHaveBeenLastCalledWith(
      ID,
      { answer: "no", note: "Out of town." },
      you.id,
      "2026-11-10",
    );
  });
});

describe("getLoanController", () => {
  controllerBasics({
    make: (useCase, logger) => getLoanController(useCase, logger),
    valid: { loanId: ID },
    calledWith: [ID, you.id, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)],
    invalid: { "a loan that isn't an id": { loanId: "night-market" } },
  });
});

describe("listLoansController", () => {
  it("turns away a signed-out user, and lists the member's loans as of today", async () => {
    const useCase = mock(async () => ({ needsYou: [], youAsked: [] }));
    const controller = listLoansController(
      useCase as never,
      new MockLoggerService(),
    );
    await expect(controller(undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    expect(useCase).not.toHaveBeenCalled();
    await controller(you.id);
    expect(useCase).toHaveBeenCalledWith(
      you.id,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });
});

describe("recordLoanController", () => {
  const loan = { userGameId: ID, borrowerUserId: ID, pickedUpOn: "2026-11-08" };
  controllerBasics({
    make: (useCase, logger) => recordLoanController(useCase, logger),
    valid: { ...loan, periodDays: 14 },
    calledWith: [
      { ...loan, periodDays: 14 },
      you.id,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ],
    invalid: {
      "a period C9 doesn't offer": { ...loan, periodDays: 10 },
      "no friend": { userGameId: ID, pickedUpOn: "2026-11-08", periodDays: 7 },
      "a period and a date both": {
        ...loan,
        periodDays: 7,
        dueOn: "2026-11-20",
      },
      "a day that isn't one": { ...loan, pickedUpOn: "Sunday", periodDays: 7 },
    },
  });
});

describe("listPastLoansController", () => {
  it("turns away a signed-out user, and lists the member's past loans", async () => {
    const useCase = mock(async () => ({ borrowed: [], lent: [] }));
    const controller = listPastLoansController(
      useCase as never,
      new MockLoggerService(),
    );
    await expect(controller(undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    expect(useCase).not.toHaveBeenCalled();
    await controller(you.id);
    expect(useCase).toHaveBeenCalledWith(you.id);
  });
});

describe("getRecordLoanChoicesController", () => {
  it("turns away a signed-out user, and reads C9's choices as of today", async () => {
    const useCase = mock(async () => ({ copies: [], friends: [] }));
    const controller = getRecordLoanChoicesController(
      useCase as never,
      new MockLoggerService(),
    );
    await expect(controller(undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    expect(useCase).not.toHaveBeenCalled();
    await controller(you.id);
    expect(useCase).toHaveBeenCalledWith(
      you.id,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });
});

describe("passAlongController", () => {
  controllerBasics({
    make: (useCase, logger) => passAlongController(useCase, logger),
    valid: { loanId: ID },
    calledWith: [ID, you.id],
    invalid: { "a loan that isn't an id": { loanId: "moss" } },
  });
});

describe("takeBackPassAlongController", () => {
  controllerBasics({
    make: (useCase, logger) => takeBackPassAlongController(useCase, logger),
    valid: { loanId: ID },
    calledWith: [ID, you.id],
    invalid: { "no loan": {} },
  });
});

describe("confirmPassAlongController", () => {
  controllerBasics({
    make: (useCase, logger) => confirmPassAlongController(useCase, logger),
    valid: { loanId: ID, pickedUpOn: "2026-11-12" },
    calledWith: [
      ID,
      "2026-11-12",
      you.id,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ],
    invalid: {
      "a day that isn't one": { loanId: ID, pickedUpOn: "Thursday" },
      "no day": { loanId: ID },
    },
  });
});

describe("confirmPickUpController", () => {
  controllerBasics({
    make: (useCase, logger) => confirmPickUpController(useCase, logger),
    valid: { loanId: ID, pickedUpOn: "2026-11-09" },
    calledWith: [
      ID,
      "2026-11-09",
      you.id,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ],
    invalid: {
      "a day that isn't one": { loanId: ID, pickedUpOn: "yesterday" },
      "no day": { loanId: ID },
    },
  });
});

describe("giveBackController", () => {
  controllerBasics({
    make: (useCase, logger) => giveBackController(useCase, logger),
    valid: { loanId: ID, returnedOn: "2026-11-09" },
    calledWith: [
      ID,
      "2026-11-09",
      you.id,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ],
    invalid: { "a day that isn't one": { loanId: ID, returnedOn: "Monday" } },
  });
});

describe("confirmReturnController", () => {
  controllerBasics({
    make: (useCase, logger) => confirmReturnController(useCase, logger),
    valid: { loanId: ID, answer: "back", returnedOn: "2026-11-09", note: " " },
    calledWith: [
      ID,
      { answer: "back", returnedOn: "2026-11-09", note: null },
      you.id,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    ],
    invalid: {
      "an answer it doesn't know": { loanId: ID, answer: "lost" },
      "back with no day": { loanId: ID, answer: "back", note: "" },
    },
  });

  it("passes I don't have it yet", async () => {
    const useCase = mock(async () => ({ nextInLine: null }));
    await confirmReturnController(useCase as never, new MockLoggerService())(
      { loanId: ID, answer: "not-yet" },
      you.id,
    );
    expect(useCase).toHaveBeenCalledWith(
      ID,
      { answer: "not-yet" },
      you.id,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });
});

const aDay = expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/);

describe("askMoreTimeController", () => {
  controllerBasics({
    make: (useCase, logger) => askMoreTimeController(useCase, logger),
    valid: { loanId: ID, dueOn: "2026-11-20", note: " " },
    calledWith: [ID, { dueOn: "2026-11-20", note: null }, you.id, aDay],
    invalid: {
      "a day that isn't one": { loanId: ID, dueOn: "soon", note: "" },
    },
  });
});

describe("answerMoreTimeController", () => {
  controllerBasics({
    make: (useCase, logger) => answerMoreTimeController(useCase, logger),
    valid: { loanId: ID, answer: "yes", note: "" },
    calledWith: [ID, { answer: "yes", note: null }, you.id, aDay],
    invalid: {
      "an answer it doesn't know": { loanId: ID, answer: "maybe", note: "" },
      "a yes with a day that isn't one": {
        loanId: ID,
        answer: "yes",
        dueOn: "Friday",
        note: "",
      },
    },
  });

  it("passes a date of the owner's own, and a no", async () => {
    const useCase = mock(async () => undefined);
    const controller = answerMoreTimeController(
      useCase as never,
      new MockLoggerService(),
    );
    await controller(
      { loanId: ID, answer: "yes", dueOn: "2026-11-15", note: "" },
      you.id,
    );
    expect(useCase).toHaveBeenLastCalledWith(
      ID,
      { answer: "yes", dueOn: "2026-11-15", note: null },
      you.id,
      aDay,
    );
    await controller(
      { loanId: ID, answer: "no", note: "Ben's waiting." },
      you.id,
    );
    expect(useCase).toHaveBeenLastCalledWith(
      ID,
      { answer: "no", note: "Ben's waiting." },
      you.id,
      aDay,
    );
  });
});

describe("changeDueDateController", () => {
  controllerBasics({
    make: (useCase, logger) => changeDueDateController(useCase, logger),
    valid: { loanId: ID, dueOn: "2026-11-17" },
    calledWith: [ID, "2026-11-17", you.id, aDay],
    invalid: { "no day": { loanId: ID } },
  });
});

describe("callBackController", () => {
  controllerBasics({
    make: (useCase, logger) => callBackController(useCase, logger),
    valid: { loanId: ID },
    calledWith: [ID, you.id, aDay],
    invalid: { "a loan that isn't an id": { loanId: "gull-and-anchor" } },
  });
});
