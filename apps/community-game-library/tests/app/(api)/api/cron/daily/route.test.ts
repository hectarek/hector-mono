import { afterEach, describe, expect, it } from "bun:test";
import { POST } from "@/app/(api)/api/cron/daily/route";

const SECRET = "a-fictional-cron-secret";

const run = (authorization?: string) =>
  POST(
    new Request("http://localhost:3102/api/cron/daily", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    }),
  );

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("the daily run's route (KTD8)", () => {
  it("does nothing, answering 401, with no secret set or any other token", async () => {
    expect((await run(`Bearer ${SECRET}`)).status).toBe(401);

    process.env.CRON_SECRET = SECRET;
    expect((await run()).status).toBe(401);
    expect((await run("Bearer another-secret")).status).toBe(401);
    expect((await run(SECRET)).status).toBe(401);
  });

  it("runs on the schedule's token and says how many it wrote and closed, and a second run writes nothing", async () => {
    process.env.CRON_SECRET = SECRET;
    const response = await run(`Bearer ${SECRET}`);
    expect(response.status).toBe(200);
    const first = (await response.json()) as {
      reminders: number;
      closed: number;
    };
    expect(typeof first.reminders).toBe("number");
    expect(await (await run(`Bearer ${SECRET}`)).json()).toEqual({
      reminders: 0,
      closed: 0,
    });
  });
});
