import { beforeEach, describe, expect, it } from "bun:test";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { DeleteCompanyButton } from "@/app/_components/delete-company-button";
import { getCompany, saveCompany } from "@/app/actions/companies";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

beforeEach(() => {
  nextState.pushed = [];
});

describe("deleting a company", () => {
  it("asks first, deletes, and goes back to the companies", async () => {
    signInAs("owner");
    const saved = await saveCompany({ name: "Fictional Widgets Inc" });
    if (!saved.ok) throw new Error(`The save failed: ${saved.code}`);
    const { company } = saved.data;
    const view = render(<DeleteCompanyButton company={company} />);

    fireEvent.click(view.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(`Delete ${company.name}?`)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(nextState.pushed).toEqual(["/companies"]));
    expect(await getCompany({ id: company.id })).toMatchObject({
      ok: false,
      code: "not-found",
    });
  });

  it("says why when the server refuses, and stays", async () => {
    signInAs("owner");
    const saved = await saveCompany({ name: "Fictional Widgets Inc" });
    if (!saved.ok) throw new Error(`The save failed: ${saved.code}`);
    const view = render(<DeleteCompanyButton company={saved.data.company} />);

    // Claude's session, had the button shown for it: the server refuses (R21).
    signInAs("agent");
    fireEvent.click(view.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(
      await within(dialog).findByText("Only Hector can do this."),
    ).toBeTruthy();
    expect(nextState.pushed).toEqual([]);
  });
});
