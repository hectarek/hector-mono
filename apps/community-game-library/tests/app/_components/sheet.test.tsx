import { afterEach, describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { Activity, useState } from "react";
import { Sheet, SheetActions } from "@/app/_components/sheet";
import { focused } from "@/tests/_support/focus";

// Polled as a boolean: Bun prints a whole element when an expectation on one fails, which
// takes seconds and starves waitFor's retries.
const isClosed = (view: ReturnType<typeof render>) =>
  expect(view.queryByRole("dialog") === null).toBe(true);

// A page with a button that opens a sheet, as C1's Borrow opens Ask to borrow.
function Page({ mode }: { mode: "visible" | "hidden" }) {
  const [open, setOpen] = useState(false);
  return (
    <Activity mode={mode}>
      <button type="button" onClick={() => setOpen(true)}>
        Borrow
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Ask to borrow">
        <p>Sam picks how long you can keep it.</p>
        <SheetActions>
          <button type="button">Send request</button>
        </SheetActions>
      </Sheet>
    </Activity>
  );
}

async function openSheet(view: ReturnType<typeof render>) {
  const opener = view.getByRole("button", { name: "Borrow" });
  opener.focus();
  fireEvent.click(opener);
  return view.findByRole("dialog", { name: "Ask to borrow" });
}

// happy-dom's own handle on its window, to set the screen's width.
const { happyDOM } = window as unknown as {
  happyDOM: { setInnerWidth: (width: number) => void };
};
const width = window.innerWidth;
afterEach(() => {
  happyDOM.setInnerWidth(width);
});

describe("Sheet", () => {
  // From 768px a sheet is a centered dialog; on a phone it rises from the bottom (KTD14).
  it("is a dialog from 768px and a bottom sheet on a phone", async () => {
    happyDOM.setInnerWidth(1024);
    const wide = render(<Page mode="visible" />);
    await openSheet(wide);
    expect(document.querySelector("[data-slot=dialog-content]")).toBeTruthy();
    wide.unmount();

    happyDOM.setInnerWidth(390);
    const phone = render(<Page mode="visible" />);
    await openSheet(phone);
    expect(document.querySelector("[data-slot=drawer-popup]")).toBeTruthy();
  });

  it("takes the cursor, and gives it back when Cancel closes it", async () => {
    const view = render(<Page mode="visible" />);
    await openSheet(view);
    await waitFor(() => expect(focused()).toBe("Close"));

    fireEvent.click(view.getByRole("button", { name: "Cancel" }));
    await waitFor(() => isClosed(view));
    await waitFor(() => expect(focused()).toBe("Borrow"));
  });

  // Recipes' D88: Next.js hides a page you leave rather than unmounting it, so a sheet left open
  // is closed when you come back.
  it("is closed when you come back to the page", async () => {
    const view = render(<Page mode="visible" />);
    await openSheet(view);

    view.rerender(<Page mode="hidden" />);
    view.rerender(<Page mode="visible" />);
    await waitFor(() => isClosed(view));
  });
});
