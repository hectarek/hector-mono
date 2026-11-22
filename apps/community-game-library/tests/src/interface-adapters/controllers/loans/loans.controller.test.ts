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
import { answerRequestController } from "@/src/interface-adapters/controllers/loans/answer-request.controller";
import { cancelLoanController } from "@/src/interface-adapters/controllers/loans/cancel-loan.controller";
import { getLoanController } from "@/src/interface-adapters/controllers/loans/get-loan.controller";
import { listLoansController } from "@/src/interface-adapters/controllers/loans/list-loans.controller";
import { requestLoanController } from "@/src/interface-adapters/controllers/loans/request-loan.controller";
import { withdrawRequestController } from "@/src/interface-adapters/controllers/loans/withdraw-request.controller";
import { CAST } from "@/tests/_support/cast";
import { controllerBasics, ID } from "@/tests/_support/controller";

const { you } = CAST.people;

describe("requestLoanController", () => {
  controllerBasics({
    make: (useCase, logger) => requestLoanController(useCase, logger),
    valid: { userGameId: ID, note: "  Can I grab it Friday?  " },
    calledWith: [{ userGameId: ID, note: "Can I grab it Friday?" }, you.id],
    invalid: {
      "a copy that isn't an id": { userGameId: "harbor", note: "" },
      "a note over 500 characters": { userGameId: ID, note: "x".repeat(501) },
    },
  });

  it("sends an empty note as none", async () => {
    const useCase = mock(async () => undefined);
    await requestLoanController(useCase as never, new MockLoggerService())(
      { userGameId: ID, note: "   " },
      you.id,
    );
    expect(useCase).toHaveBeenCalledWith(
      { userGameId: ID, note: null },
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
