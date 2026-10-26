import { describe, expect, it } from "bun:test";
import { listActivity } from "@/app/actions/activity";
import { saveCompany } from "@/app/actions/companies";
import { signInAs } from "@/tests/_support/session";

describe("listActivity", () => {
  it("answers Claude's session with the owner's changes to a record, newest first", async () => {
    signInAs("owner");
    const created = await saveCompany({ name: "Fictional Widgets Ltd" });
    if (!created.ok) throw new Error(`The save failed: ${created.code}`);
    const { id, updatedAt } = created.data.company;
    signInAs("agent");
    await saveCompany(
      { id, updatedAt: updatedAt.toISOString(), tier: 2 },
      "save_company",
    );

    const result = await listActivity({ record: { kind: "company", id } });

    expect(result).toEqual({
      ok: true,
      data: {
        entries: [
          expect.objectContaining({ actor: "agent", action: "updated" }),
          expect.objectContaining({ actor: "owner", action: "created" }),
        ],
        nextOffset: null,
      },
      asOf: expect.any(String),
    });
  });

  it("answers a filter it can't read with `validation`, naming the field", async () => {
    signInAs("agent");
    expect(await listActivity({ limit: 51 })).toMatchObject({
      ok: false,
      code: "validation",
      fields: { limit: expect.any(String) },
    });
  });

  it("answers a session the app can't act for with its code", async () => {
    signInAs("stranger");
    expect(await listActivity({})).toMatchObject({
      ok: false,
      code: "not-allowed",
    });
    signInAs("signed-out");
    expect(await listActivity({})).toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
  });
});
