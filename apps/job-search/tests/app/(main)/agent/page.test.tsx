import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import { AGENT_TOOLS } from "@/app/_lib/agent-tools/registry";
import AgentPage from "@/app/(main)/agent/page";
import { startSession } from "@/app/actions/session";
import { getInjection } from "@/di/container";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { Redirected } from "@/tests/_support/next";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const section = async (name: string) =>
  within(
    within(await renderOnServer(await AgentPage())).getByRole("region", {
      name,
    }),
  );

describe("Claude's page", () => {
  it("lists Claude's page tools, each with its description", async () => {
    signInAs("agent");
    const tools = await section("Page tools");
    for (const { name, description } of AGENT_TOOLS) {
      expect(tools.getByText(name)).toBeTruthy();
      expect(tools.getByText(description)).toBeTruthy();
    }
    expect(tools.getByText("Read-only")).toBeTruthy();
    expect(tools.getByText("Outside text")).toBeTruthy();
  });

  it("lists Claude's latest changes, its session's start among them, and not Hector's", async () => {
    signInAs("owner");
    await getInjection("ITransactionManagerService").startTransaction((tx) =>
      recordChange(
        getInjection("IActivityRepository"),
        tx,
        { actor: "owner", ownerId: TEST_ACCOUNTS.owner.user.id },
        {
          record: { kind: "job", id: crypto.randomUUID() },
          action: "updated",
          before: { status: "verify" },
          after: { status: "applied" },
        },
      ),
    );
    signInAs("agent");
    await startSession({}, "start_session");

    const activity = await section("Recent activity");
    const [latest] = activity.getAllByRole("listitem");
    if (!latest) throw new Error("Claude's session start isn't listed");
    expect(within(latest).getByText("Started a session")).toBeTruthy();
    expect(within(latest).getByText("start_session")).toBeTruthy();
    expect(activity.queryByText("Updated a job")).toBeNull();
  });

  it("sends an account that isn't one of the app's two to the private screen", async () => {
    signInAs("stranger");
    const outcome = await AgentPage().catch((err: unknown) => err);
    expect(outcome).toBeInstanceOf(Redirected);
    expect((outcome as Redirected).url).toBe("/private");
  });
});
