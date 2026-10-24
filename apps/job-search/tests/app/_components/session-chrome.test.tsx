import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import MainLayout from "@/app/(main)/layout";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

// The signed-in layout as the server streams it, around a page.
const layoutAroundAPage = async () =>
  within(
    await renderOnServer(
      <MainLayout>
        <h1>This week</h1>
      </MainLayout>,
    ),
  );

describe("the session chrome", () => {
  it("tells Claude's session whose session it is, above the page", async () => {
    signInAs("agent");
    const view = await layoutAroundAPage();
    expect(view.getByText("Claude's session")).toBeTruthy();
    expect(view.getByRole("heading", { name: "This week" })).toBeTruthy();
  });

  it("shows Hector's session no banner", async () => {
    signInAs("owner");
    const view = await layoutAroundAPage();
    expect(view.queryByText("Claude's session")).toBeNull();
    expect(view.getByRole("heading", { name: "This week" })).toBeTruthy();
  });
});
