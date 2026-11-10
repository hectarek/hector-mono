import { afterEach, describe, expect, it } from "bun:test";
import { POST } from "@/app/(api)/api/cron/archive-expired/route";
import { getJob } from "@/app/actions/jobs";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { aClaudeJob, aCompany, dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const SECRET = "a-fictional-cron-secret";

const run = (authorization?: string) =>
  POST(
    new Request("http://localhost:3101/api/cron/archive-expired", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    }),
  );

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("the daily run's route (KTD24)", () => {
  it("does nothing, answering 401, with no secret set or any other token", async () => {
    expect((await run(`Bearer ${SECRET}`)).status).toBe(401);

    process.env.CRON_SECRET = SECRET;
    expect((await run()).status).toBe(401);
    expect((await run("Bearer another-secret")).status).toBe(401);
    expect((await run(SECRET)).status).toBe(401);
  });

  it("archives the owner's expired jobs on the schedule's token, and says how many", async () => {
    const old = await aClaudeJob(await aCompany(), {
      postedOn: addDays(todayIn(PLAN_TIME_ZONE), -30),
    });
    process.env.CRON_SECRET = SECRET;

    const response = await run(`Bearer ${SECRET}`);

    expect(response.status).toBe(200);
    const { archived } = (await response.json()) as { archived: number };
    expect(archived).toBeGreaterThan(0);
    signInAs("owner");
    expect(dataOf(await getJob({ id: old.id })).job.status).toBe("skipped");
    expect(await (await run(`Bearer ${SECRET}`)).json()).toEqual({
      archived: 0,
    });
  });
});
