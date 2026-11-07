import { afterEach, describe, expect, it } from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { APP_TOASTER, notify } from "@/app/_lib/notify";

// Sonner keeps its toasts in a store of its own, which outlives a test's render.
afterEach(() => {
  toast.dismiss();
});

describe("the app's toasts", () => {
  // Neon Auth's provider mounts a toaster with no id around every page, beside the shell's.
  it("show on the shell's toaster only, so each is read out once", async () => {
    render(
      <>
        <Toaster />
        <Toaster id={APP_TOASTER} />
      </>,
    );

    notify("Pushed to Fri, Nov 6.");

    expect(await screen.findAllByText("Pushed to Fri, Nov 6.")).toHaveLength(1);
    const [, shells] = screen.getAllByRole("region");
    expect(shells?.textContent).toContain("Pushed to Fri, Nov 6.");
  });
});
