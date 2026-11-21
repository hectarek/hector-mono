import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { ShareButton } from "@/app/_components/share-button";
import { APP_TOASTER } from "@/app/_lib/notify";

const MESSAGE = "Join me on Community Game Library";
const LINK = "https://communitygamelibrary.com/f/K7Q2-HARB";

// What the browser was asked to do.
let copied: string[];
let shared: ShareData[];

beforeEach(() => {
  copied = [];
  shared = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        copied.push(text);
      },
    },
  });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "share");
});

function renderButton() {
  return render(
    <>
      <ShareButton text={MESSAGE} url={LINK} copied="Link copied" />
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
}

// KTD18: the phone's share sheet, or the message copied with a toast where there's none.
describe("ShareButton", () => {
  it("copies the message and says so where the browser can't share", async () => {
    expect("share" in navigator).toBe(false);
    const view = renderButton();
    fireEvent.click(view.getByRole("button", { name: "Share" }));

    expect(await view.findByText("Link copied")).toBeTruthy();
    expect(copied).toEqual([`${MESSAGE} ${LINK}`]);
  });

  it("opens the share sheet where there is one, and copies nothing", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        shared.push(data);
      },
    });
    const view = renderButton();
    fireEvent.click(view.getByRole("button", { name: "Share" }));

    await waitFor(() => expect(shared).toEqual([{ text: MESSAGE, url: LINK }]));
    expect(copied).toEqual([]);
  });

  // Closing the share sheet unsent is the person's choice, so nothing is copied instead.
  it("copies nothing when the share sheet is closed unsent", async () => {
    let asked = 0;
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        asked += 1;
        throw new DOMException("Share canceled", "AbortError");
      },
    });
    const view = renderButton();
    fireEvent.click(view.getByRole("button", { name: "Share" }));

    await waitFor(() => expect(asked).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(copied).toEqual([]);
  });
});
