import { beforeEach, describe, expect, it } from "bun:test";
import { OWNER } from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

// What the tables refuse on their own, whatever path a row comes by (PGlite, with the migrations).
describe("the tables [postgres]", () => {
  beforeEach(resetDatabase);

  const company = (tier: number | null, headcount: number | null) =>
    sql(
      "insert into companies (owner_id, name, name_key, tier, headcount) values ($1, 'Acme Inc', 'acmeinc', $2, $3)",
      [OWNER, tier, headcount],
    );

  it("keep a company's tier to 1, 2 or 3, and its headcount above 0", async () => {
    await company(3, 1);
    await expect(company(4, null)).rejects.toThrow();
    await expect(company(null, 0)).rejects.toThrow();
  });

  it("list a lead source once per owner and name key", async () => {
    const source = () =>
      sql(
        "insert into lead_sources (owner_id, name, name_key) values ($1, 'Widget Jobs', 'widget jobs')",
        [OWNER],
      );
    await source();
    await expect(source()).rejects.toThrow();
  });

  it("keep settings' targets and the pay floor at 0 or more", async () => {
    const settings = (target: number, payFloor: number | null) =>
      sql(
        "insert into settings (owner_id, messages_sent_target, pay_floor) values ($1, $2, $3)",
        [OWNER, target, payFloor],
      );
    await expect(settings(-1, null)).rejects.toThrow();
    await expect(settings(0, -1)).rejects.toThrow();
    await settings(0, 0);
  });

  // R12 as revised 2026-11-10 (U20).
  it("keep a season's start and finish together, the finish after the start, and its checkpoints a list of at most three", async () => {
    const season = (
      start: string | null,
      finish: string | null,
      checkpoints = "[]",
    ) =>
      sql(
        "insert into settings (owner_id, season_start, season_finish, season_checkpoints) values ($1, $2, $3, $4::jsonb)",
        [OWNER, start, finish, checkpoints],
      );
    const checkpoint = '{"on": "2026-11-13", "name": "A checkpoint"}';
    await expect(season("2026-11-02", null)).rejects.toThrow();
    await expect(season(null, "2027-02-01")).rejects.toThrow();
    await expect(season("2026-11-02", "2026-11-02")).rejects.toThrow();
    await expect(
      season("2026-11-02", "2027-02-01", `[${Array(4).fill(checkpoint)}]`),
    ).rejects.toThrow();
    await expect(
      season("2026-11-02", "2027-02-01", checkpoint),
    ).rejects.toThrow();
    await season("2026-11-02", "2027-02-01", `[${checkpoint}]`);
  });

  // R10 as revised 2026-11-10 (U20).
  it("keep a week's plan to its Monday, one per owner and week", async () => {
    const plan = (week: string) =>
      sql(
        "insert into week_plans (owner_id, week, milestone) values ($1, $2, 'A milestone')",
        [OWNER, week],
      );
    await expect(plan("2026-11-11")).rejects.toThrow();
    await plan("2026-11-09");
    await expect(plan("2026-11-09")).rejects.toThrow();
  });

  it("keep when a row last changed to the millisecond, a JS Date's precision", async () => {
    await company(null, null);
    const [row] = await sql<{ fraction: string }>(
      "select to_char(updated_at, 'US') as fraction from companies",
    );
    expect(row?.fraction.endsWith("000")).toBe(true);
  });

  // Jobs (U6): a company and a source to name, as the use cases make them.
  const aCompany = () =>
    sql<{ id: string }>(
      "insert into companies (owner_id, name, name_key) values ($1, 'Acme Inc', 'acmeinc') returning id",
      [OWNER],
    );
  const aSource = () =>
    sql<{ id: string }>(
      "insert into lead_sources (owner_id, name, name_key) values ($1, 'Referral', 'referral') returning id",
      [OWNER],
    );
  const aJob = (
    companyId: string,
    sourceId: string,
    columns: Record<string, unknown> = {},
  ) => {
    const values = {
      owner_id: OWNER,
      company_id: companyId,
      lead_source_id: sourceId,
      role: "Widget engineer",
      status: "verify",
      found_on: "2026-10-26",
      ...columns,
    };
    const names = Object.keys(values);
    return sql<{ id: string }>(
      `insert into jobs (${names.join(", ")}) values (${names.map((name) => `$${names.indexOf(name) + 1}`).join(", ")}) returning id`,
      Object.values(values),
    );
  };

  it("keep a posting's key to one job per owner, and statuses, the band and the fit score to what the app knows", async () => {
    const [acme] = await aCompany();
    const [referral] = await aSource();
    if (!acme || !referral) throw new Error("No company or source");

    await aJob(acme.id, referral.id, {
      posting_key: "linkedin.com/jobs/view/1",
    });
    await expect(
      aJob(acme.id, referral.id, { posting_key: "linkedin.com/jobs/view/1" }),
    ).rejects.toThrow();
    await aJob(acme.id, referral.id);
    await aJob(acme.id, referral.id);
    await expect(
      aJob(acme.id, referral.id, { status: "hired" }),
    ).rejects.toThrow();
    await expect(
      aJob(acme.id, referral.id, { pay_min: 100, pay_max: 50 }),
    ).rejects.toThrow();
    await expect(aJob(acme.id, referral.id, { pay_max: -1 })).rejects.toThrow();
    await expect(aJob(acme.id, referral.id, { score: 11 })).rejects.toThrow();
    await aJob(acme.id, referral.id, { score: 10 });
  });

  it("refuse to delete a company that has jobs, and take a job's status moves with it", async () => {
    const [acme] = await aCompany();
    const [referral] = await aSource();
    if (!acme || !referral) throw new Error("No company or source");
    const [made] = await aJob(acme.id, referral.id);
    if (!made) throw new Error("No job");
    await sql(
      "insert into job_status_changes (owner_id, job_id, from_status, to_status, occurred_on, actor) values ($1, $2, 'verify', 'target', '2026-10-26', 'owner')",
      [OWNER, made.id],
    );

    await expect(
      sql("delete from companies where id = $1", [acme.id]),
    ).rejects.toThrow();
    await sql("delete from jobs where id = $1", [made.id]);
    expect(await sql("select * from job_status_changes")).toEqual([]);
  });
});
