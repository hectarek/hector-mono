import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import NewCompanyPage from "@/app/(main)/companies/new/page";
import type { Redirected } from "@/tests/_support/next";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

describe("adding a company", () => {
  it("opens an empty form", async () => {
    signInAs("owner");
    const page = within(await renderOnServer(await NewCompanyPage()));

    expect(page.getByLabelText<HTMLInputElement>("Name").value).toBe("");
    expect(page.getByRole("button", { name: "Add company" })).toBeTruthy();
  });

  it("sends an account that isn't one of the app's two to the private screen", async () => {
    signInAs("stranger");
    const outcome = await NewCompanyPage().catch((err: unknown) => err);
    expect((outcome as Redirected).url).toBe("/private");
  });
});
