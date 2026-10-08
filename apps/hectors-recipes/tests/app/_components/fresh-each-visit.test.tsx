import { beforeEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FreshEachVisit } from "@/app/_components/fresh-each-visit";
import { nextState, resetNextState } from "@/tests/_support/next";

// D88: a form you saved or threw away starts over on your next visit, while Back brings
// back what you were typing.
describe("FreshEachVisit", () => {
  beforeEach(resetNextState);

  it("keeps what was typed until a fresh visit starts it over", async () => {
    const user = userEvent.setup();
    const page = () => (
      <FreshEachVisit>
        <input aria-label="Title" />
      </FreshEachVisit>
    );
    const title = (view: ReturnType<typeof render>) =>
      (view.getByRole("textbox", { name: "Title" }) as HTMLInputElement).value;

    const view = render(page());
    await user.type(view.getByRole("textbox", { name: "Title" }), "Chili");

    // Back, Forward or a refresh: the same visit.
    view.rerender(page());
    expect(title(view)).toBe("Chili");

    // A link or a redirect: a new one.
    nextState.visit = "visit-2";
    view.rerender(page());
    expect(title(view)).toBe("");
  });
});
