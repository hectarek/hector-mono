import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { ActionForm } from "@/app/_components/action-form";
import type { ActionState } from "@/app/actions/shared";

const COPY_ID = "00000000-0000-4000-8000-0000000000c1";

// An action that waits until the test lets it answer, and keeps what it was sent.
function heldAction(answer: ActionState) {
  const sent: FormData[] = [];
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const action = async (_state: ActionState, formData: FormData) => {
    sent.push(formData);
    await held;
    return answer;
  };
  return { action, sent, release: () => release() };
}

describe("ActionForm", () => {
  it("sends its hidden fields, shows the action pending, then the action's error", async () => {
    const { action, sent, release } = heldAction({
      error: "You can remove it once it's back.",
    });
    const view = render(
      <ActionForm action={action} fields={{ copyId: COPY_ID }}>
        {({ isPending }) => (
          <button type="submit" disabled={isPending}>
            Remove
          </button>
        )}
      </ActionForm>,
    );
    const remove = view.getByRole("button", { name: "Remove" });

    // React builds the form's data from the event's target, which happy-dom can't do for a
    // button, so the form is submitted.
    const formElement = remove.closest("form");
    if (!formElement) {
      throw new Error("ActionForm renders no form");
    }
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(remove.hasAttribute("disabled")).toBe(true);
    });
    expect(sent.map((data) => data.get("copyId"))).toEqual([COPY_ID]);

    release();
    expect((await view.findByRole("alert")).textContent).toBe(
      "You can remove it once it's back.",
    );
    expect(remove.hasAttribute("disabled")).toBe(false);
  });

  it("shows nothing more when the action succeeds", async () => {
    const { action, release } = heldAction(null);
    release();
    const view = render(
      <ActionForm action={action} fields={{ copyId: COPY_ID }}>
        {() => <button type="submit">Remove</button>}
      </ActionForm>,
    );
    const formElement = view
      .getByRole("button", { name: "Remove" })
      .closest("form");
    if (!formElement) {
      throw new Error("ActionForm renders no form");
    }
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(view.queryByRole("alert")).toBeNull();
    });
  });
});
