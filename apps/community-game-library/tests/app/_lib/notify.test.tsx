import { describe, expect, it } from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { act, fireEvent, render } from "@testing-library/react";
import { APP_TOASTER, notify, notifyNotSent } from "@/app/_lib/notify";

// screens.md rule 5: every action says what happened, with Undo where it can be undone (KTD17).
describe("notify", () => {
  it("says what happened on the app's toaster, with Undo", async () => {
    let undone = 0;
    const view = render(<Toaster id={APP_TOASTER} theme="light" />);
    act(() => {
      notify("Harbor Master is in My library", {
        action: { label: "Undo", onClick: () => (undone += 1) },
      });
    });

    expect(
      await view.findByText("Harbor Master is in My library"),
    ).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Undo" }));
    expect(undone).toBe(1);
  });

  // Neon's sign-in kit mounts a toaster without an id (U5): the app's toasts never show there.
  it("shows only on the app's toaster", async () => {
    const view = render(
      <>
        <Toaster id={APP_TOASTER} theme="light" />
        <Toaster theme="light" />
      </>,
    );
    act(() => {
      notify("Request sent to Sam");
    });
    await view.findByText("Request sent to Sam");
    expect(view.getAllByText("Request sent to Sam")).toHaveLength(1);
  });

  // screens.md, When something goes wrong: a send that fails says so, and Try again sends it.
  it("says a send failed, with Try again", async () => {
    let tries = 0;
    const view = render(<Toaster id={APP_TOASTER} theme="light" />);
    act(() => {
      notifyNotSent(() => {
        tries += 1;
      });
    });

    expect(await view.findByText("That didn’t send.")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Try again" }));
    expect(tries).toBe(1);
  });
});
