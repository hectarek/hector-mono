import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import { RecordHistory } from "@/app/_components/record-history";
import { getInjection } from "@/di/container";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const OWNER_ID = TEST_ACCOUNTS.owner.user.id;
const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER_ID };
const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER_ID,
  tool: "set_job_status",
};

// A change written to the test container's log, as a write's use case writes one.
const made = (
  context: ChangeContext,
  change: Parameters<typeof recordChange>[3],
) =>
  getInjection("ITransactionManagerService").startTransaction((tx) =>
    recordChange(getInjection("IActivityRepository"), tx, context, change),
  );

const newJob = (): RecordRef => ({ kind: "job", id: crypto.randomUUID() });

const historyOf = async (record: RecordRef) => {
  const page = within(await renderOnServer(<RecordHistory record={record} />));
  return within(page.getByRole("region", { name: "History" }));
};

describe("a record's history", () => {
  it("lists the record's changes newest first, with who made each, the tool, and each field before and after", async () => {
    signInAs("owner");
    const job = newJob();
    await made(HECTOR, {
      record: job,
      action: "created",
      after: { role: "Widget designer", status: "verify" },
    });
    await made(CLAUDE, {
      record: job,
      action: "updated",
      before: { status: "verify" },
      after: { status: "applied" },
      reason: "Applied through the posting",
    });
    await made(HECTOR, {
      record: newJob(),
      action: "deleted",
      before: { role: "Another role" },
    });

    const history = await historyOf(job);
    const [latest, earlier, ...others] = history.getAllByRole("listitem");
    if (!latest || !earlier) throw new Error("Expected the job's two changes");
    expect(others).toEqual([]);

    const move = within(latest);
    expect(move.getByText("Claude")).toBeTruthy();
    expect(move.getByText("Updated")).toBeTruthy();
    expect(move.getByText("set_job_status")).toBeTruthy();
    expect(move.getByRole("term").textContent).toBe("Status");
    expect(move.getByRole("deletion").textContent).toBe("verify");
    expect(move.getByRole("insertion").textContent).toBe("applied");
    expect(move.getByText("Reason: Applied through the posting")).toBeTruthy();
    expect(latest.querySelector("time")?.getAttribute("datetime")).toBeTruthy();

    const creation = within(earlier);
    expect(creation.getByText("Hector")).toBeTruthy();
    expect(creation.getByText("Created")).toBeTruthy();
    expect(creation.queryByText("set_job_status")).toBeNull();
    expect(
      creation.getAllByRole("term").map((term) => term.textContent),
    ).toEqual(["Role", "Status"]);
    expect(creation.queryByRole("deletion")).toBeNull();
    expect(
      creation.getAllByRole("insertion").map((value) => value.textContent),
    ).toEqual(["Widget designer", "verify"]);
  });

  // AE2: Claude's try at something only Hector may do shows in the record's history.
  it("shows a refused attempt and what was tried", async () => {
    signInAs("owner");
    const job = newJob();
    await made(
      { actor: "agent", ownerId: OWNER_ID },
      { record: job, action: "refused", reason: "delete" },
    );

    const [refusal] = (await historyOf(job)).getAllByRole("listitem");
    if (!refusal) throw new Error("No refusal listed");
    const entry = within(refusal);
    expect(entry.getByText("Claude")).toBeTruthy();
    expect(entry.getByText("Refused")).toBeTruthy();
    expect(entry.getByText("Tried to delete")).toBeTruthy();
  });

  it("says so when the record has no changes yet", async () => {
    signInAs("owner");
    const history = await historyOf(newJob());
    expect(history.getByText("No changes yet.")).toBeTruthy();
  });
});
