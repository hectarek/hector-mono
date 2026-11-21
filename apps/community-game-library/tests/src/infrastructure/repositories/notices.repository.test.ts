import { beforeEach, describe, expect, it } from "bun:test";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import { noticeSchema } from "@/src/entities/models/notice.model";
import { NoticesRepository } from "@/src/infrastructure/repositories/notices.repository";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";
import {
  describeEachBackend,
  makeApp,
  postgresRepositories,
} from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";
import { resetDatabase, sql } from "@/tests/_support/database";
import { RecordingLogger } from "@/tests/_support/logger";

const { you, priya, jo } = CAST.people;
const { priyaAskedForNightMarket, joHasGullAndAnchor } = CAST.loans;

describeEachBackend("INoticesRepository", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("writes a notice in its change's transaction and gives it back, unread", async () => {
    const { notices, transactions } = app.repos;

    const notice = await transactions.startTransaction((tx) =>
      notices.add(
        {
          userId: you.id,
          type: "loan-requested",
          createdBy: priya.id,
          loanId: priyaAskedForNightMarket.id,
        },
        tx,
      ),
    );

    expect(noticeSchema.parse(notice)).toMatchObject({
      userId: you.id,
      type: "loan-requested",
      createdBy: priya.id,
      loanId: priyaAskedForNightMarket.id,
      gameNightId: null,
      gameSuggestionId: null,
      friendRequestId: null,
      answerNote: null,
      remindedOn: null,
      readAt: null,
    });
  });

  it("keeps a note the other member typed, and no one who caused it when none did", async () => {
    const { notices, transactions } = app.repos;

    const notice = await transactions.startTransaction((tx) =>
      notices.add(
        {
          userId: jo.id,
          type: "more-time-answered",
          loanId: joHasGullAndAnchor.id,
          answerNote: "Friday's fine.",
        },
        tx,
      ),
    );

    expect(notice).toMatchObject({
      createdBy: null,
      answerNote: "Friday's fine.",
    });
  });
});

describe("NoticesRepository on Postgres", () => {
  beforeEach(async () => {
    await resetDatabase();
    await makeApp(postgresRepositories()).makeCast();
  });

  const count = async () =>
    (
      await sql<{ count: number }>("select count(*)::int as count from notices")
    )[0]?.count;

  // KTD7: a notice is written with its change, so it goes if the change does.
  it("goes with a change that fails", async () => {
    const logger = new RecordingLogger();
    const notices = new NoticesRepository(logger);

    const change = new TransactionManagerService(logger).startTransaction(
      async (tx) => {
        await notices.add(
          {
            userId: you.id,
            type: "loan-requested",
            createdBy: priya.id,
            loanId: priyaAskedForNightMarket.id,
          },
          tx,
        );
        throw new DatabaseOperationError("The change failed");
      },
    );

    await expect(change).rejects.toBeInstanceOf(DatabaseOperationError);
    expect(await count()).toBe(0);
  });

  it("logs a failed notice by its member's id, never the note it carried", async () => {
    const logger = new RecordingLogger();
    const notices = new NoticesRepository(logger);
    const NOTE = "Out of town until Thursday.";

    const change = new TransactionManagerService(logger).startTransaction(
      (tx) =>
        notices.add(
          {
            userId: you.id,
            type: "more-time-asked",
            createdBy: jo.id,
            // No such loan: its foreign key refuses it.
            loanId: "00000000-0000-4000-8000-0000000003ff",
            answerNote: NOTE,
          },
          tx,
        ),
    );

    await expect(change).rejects.toBeInstanceOf(DatabaseOperationError);
    expect(logger.text).not.toContain(NOTE);
    expect(logger.lines).toContainEqual({
      level: "error",
      message: "add failed",
      context: {
        layer: "repository",
        op: "notices",
        userId: you.id,
        errorClass: "DrizzleQueryError",
        errorCode: "23503",
      },
    });
    expect(await count()).toBe(0);
  });
});
