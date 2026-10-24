import { describe, expect, it } from "bun:test";
import { getActionActor } from "@/app/_lib/current-actor";
import {
  type ActionResult,
  actionLogger,
  succeeded,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import {
  ConflictError,
  DatabaseOperationError,
  HumanOnlyError,
  InputParseError,
  NotAllowedError,
  NotFoundError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { listActivitySchema } from "@/src/entities/models/activity.model";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { RecordingLogger } from "@/tests/_support/logger";
import { signInAs } from "@/tests/_support/session";

const FALLBACK = "Couldn't save that. Try again.";
// A field value, fictional, that must stay out of the logs (docs/build-plan.md KTD20).
const VALUE = "Fictional Widgets Ltd";

describe("toActionError", () => {
  it("answers input it can't read with `validation`, naming each field as the screens and tools do", () => {
    const parsed = listActivitySchema.safeParse({
      since: "last Tuesday",
      limit: 500,
    });
    const failure = toActionError(
      new InputParseError("Invalid activity filter", { cause: parsed.error }),
      new RecordingLogger(),
      FALLBACK,
    );

    const timeHint =
      "Use an ISO time with an offset, like 2026-10-23T09:00:00-04:00";
    expect(failure).toEqual({
      ok: false,
      code: "validation",
      message: `Since: ${timeHint}`,
      fields: { since: timeHint, limit: expect.any(String) },
    });
  });

  it("answers a session the app can't act for with `unauthenticated` or `not-allowed`, and Claude's try at a human-only operation with `human-only`", () => {
    const logger = new RecordingLogger();
    expect(toActionError(new UnauthenticatedError(), logger, FALLBACK)).toEqual(
      {
        ok: false,
        code: "unauthenticated",
        message: "Your session expired. Sign in again.",
      },
    );
    expect(toActionError(new NotAllowedError(), logger, FALLBACK)).toEqual({
      ok: false,
      code: "not-allowed",
      message: "This account can't use the app.",
    });
    expect(toActionError(new HumanOnlyError(), logger, FALLBACK)).toEqual({
      ok: false,
      code: "human-only",
      message: "Only Hector can do this.",
    });
  });

  it("passes a missing record's message on, and logs only its class", () => {
    const logger = new RecordingLogger();
    expect(
      toActionError(
        new NotFoundError(`No company named ${VALUE}`),
        logger,
        FALLBACK,
      ),
    ).toEqual({
      ok: false,
      code: "not-found",
      message: `No company named ${VALUE}`,
    });
    expect(logger.text).toContain("NotFoundError");
    expect(logger.text).not.toContain(VALUE);
  });

  // R22: an edit against a record that changed since it was read is caught.
  it("answers a write against a record that changed with `conflict` and the record as it is now", () => {
    const current = { name: "Fictional Co", updatedAt: "2026-10-23T13:00Z" };
    expect(
      toActionError(
        new ConflictError(current),
        new RecordingLogger(),
        FALLBACK,
      ),
    ).toEqual({
      ok: false,
      code: "conflict",
      message: "This changed since it was read.",
      current,
    });
  });

  it("logs an unexpected error by class and code only, and answers with the action's own message", () => {
    const logger = new RecordingLogger();
    // A failed insert as the driver reports it: the parameters in the query error's message,
    // Postgres's code on the error under it.
    const driverError = Object.assign(new Error(`Key (name)=(${VALUE})`), {
      code: "23505",
    });
    const queryError = new Error(`Failed query: insert … params: ${VALUE}`, {
      cause: driverError,
    });

    expect(
      toActionError(
        new DatabaseOperationError("add failed", { cause: queryError }),
        logger,
        FALLBACK,
      ),
    ).toEqual({ ok: false, code: "unexpected", message: FALLBACK });
    expect(logger.lines).toEqual([
      {
        level: "error",
        message: "Unexpected failure",
        context: { errorClass: "DatabaseOperationError", errorCode: "23505" },
      },
    ]);
    expect(logger.text).not.toContain(VALUE);
  });
});

// A write as the app's actions make one (docs/build-plan.md KTD3, KTD4): who is acting comes
// from the session, the change and its activity row share one transaction, and the answer is an
// envelope, never a redirect. Companies arrive with U5; this stand-in renames one in the log only.
async function renameCompany(
  input: { id: string; name: string },
  tool?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await getActionActor();
    const data = await getInjection(
      "ITransactionManagerService",
    ).startTransaction(async (tx) => {
      await recordChange(
        getInjection("IActivityRepository"),
        tx,
        { ...actor, tool },
        {
          record: { kind: "company", id: input.id },
          action: "updated",
          before: { name: "Fictional Co" },
          after: { name: input.name },
        },
      );
      return { id: input.id };
    });
    return succeeded(data);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("renameCompany"),
      "Couldn't rename the company.",
    );
  }
}

describe("an action's write", () => {
  const HECTOR: CurrentActor = {
    actor: "owner",
    ownerId: TEST_ACCOUNTS.owner.user.id,
  };
  const history = async (id: string) =>
    (
      await getInjection("IListActivityController")(
        { record: { kind: "company", id } },
        HECTOR,
      )
    ).entries.map(({ actor, tool, changes }) => ({ actor, tool, changes }));

  it("answers with its data and when, and leaves one activity row per write, with who made it and the tool", async () => {
    const id = crypto.randomUUID();
    signInAs("agent");
    expect(
      await renameCompany({ id, name: "Fictional Company" }, "rename_company"),
    ).toEqual({ ok: true, data: { id }, asOf: expect.any(String) });
    signInAs("owner");
    await renameCompany({ id, name: "Fictional Company Ltd" });

    expect(await history(id)).toEqual([
      {
        actor: "owner",
        tool: null,
        changes: [
          {
            field: "name",
            before: "Fictional Co",
            after: "Fictional Company Ltd",
          },
        ],
      },
      {
        actor: "agent",
        tool: "rename_company",
        changes: [
          { field: "name", before: "Fictional Co", after: "Fictional Company" },
        ],
      },
    ]);
  });

  it("answers a session the app can't act for with its code, and writes nothing", async () => {
    const id = crypto.randomUUID();
    signInAs("stranger");
    expect(await renameCompany({ id, name: "Other" })).toMatchObject({
      ok: false,
      code: "not-allowed",
    });
    signInAs("signed-out");
    expect(await renameCompany({ id, name: "Other" })).toMatchObject({
      ok: false,
      code: "unauthenticated",
    });

    expect(await history(id)).toEqual([]);
  });
});
