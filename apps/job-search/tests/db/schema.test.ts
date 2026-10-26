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

  it("keep settings' targets at 0 or more and the queue cap at 1 or more", async () => {
    const settings = (target: number, cap: number) =>
      sql(
        "insert into settings (owner_id, messages_sent_target, pending_cap) values ($1, $2, $3)",
        [OWNER, target, cap],
      );
    await expect(settings(-1, 10)).rejects.toThrow();
    await expect(settings(0, 0)).rejects.toThrow();
    await settings(0, 1);
  });

  it("keep when a row last changed to the millisecond, a JS Date's precision", async () => {
    await company(null, null);
    const [row] = await sql<{ fraction: string }>(
      "select to_char(updated_at, 'US') as fraction from companies",
    );
    expect(row?.fraction.endsWith("000")).toBe(true);
  });
});
