import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import EditCompanyPage from "@/app/(main)/companies/[id]/edit/page";
import { saveCompany } from "@/app/actions/companies";
import { NotFoundPage } from "@/tests/_support/next";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

describe("editing a company", () => {
  it("opens Claude's session on the company as it is", async () => {
    signInAs("owner");
    const saved = await saveCompany({
      name: "Fictional Widgets Corp",
      location: "Springfield",
    });
    if (!saved.ok) throw new Error(`The save failed: ${saved.code}`);

    signInAs("agent");
    const page = within(
      await renderOnServer(
        await EditCompanyPage({
          params: Promise.resolve({ id: saved.data.company.id }),
        }),
      ),
    );

    expect(
      page.getByRole("heading", { name: "Edit Fictional Widgets Corp" }),
    ).toBeTruthy();
    expect(page.getByLabelText<HTMLInputElement>("Location").value).toBe(
      "Springfield",
    );
    expect(page.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("is not found for an unknown company", async () => {
    signInAs("owner");
    expect(
      await EditCompanyPage({
        params: Promise.resolve({ id: crypto.randomUUID() }),
      }).catch((err: unknown) => err),
    ).toBeInstanceOf(NotFoundPage);
  });
});
