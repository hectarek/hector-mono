import { beforeEach, describe, expect, it } from "bun:test";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { DeleteButton } from "@/app/_components/delete-button";
import {
  deleteCompany,
  getCompany,
  saveCompany,
} from "@/app/actions/companies";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

beforeEach(() => {
  nextState.pushed = [];
});

const aCompany = async () => {
  const saved = await saveCompany({ name: "Fictional Widgets Inc" });
  if (!saved.ok) throw new Error(`The save failed: ${saved.code}`);
  return saved.data.company;
};

const confirmIn = async (view: ReturnType<typeof render>) => {
  fireEvent.click(view.getByRole("button", { name: "Delete" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
  return dialog;
};

describe("deleting", () => {
  it("asks first, deletes, and goes where it's told", async () => {
    signInAs("owner");
    const company = await aCompany();
    const view = render(
      <DeleteButton
        what={company.name}
        action={() => deleteCompany({ id: company.id })}
        then="/companies"
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "Delete" }));
    expect(
      within(await screen.findByRole("dialog")).getByText(
        `Delete ${company.name}?`,
      ),
    ).toBeTruthy();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete",
      }),
    );

    await waitFor(() => expect(nextState.pushed).toEqual(["/companies"]));
    expect(await getCompany({ id: company.id })).toMatchObject({
      ok: false,
      code: "not-found",
    });
  });

  it("says why when the server refuses, and stays", async () => {
    signInAs("owner");
    const company = await aCompany();
    const view = render(
      <DeleteButton
        what={company.name}
        action={() => deleteCompany({ id: company.id })}
        then="/companies"
      />,
    );

    // Claude's session, had the button shown for it: the server refuses (R21).
    signInAs("agent");
    const dialog = await confirmIn(view);

    expect(
      await within(dialog).findByText("Only Hector can do this."),
    ).toBeTruthy();
    expect(nextState.pushed).toEqual([]);
  });
});
