import { afterEach, describe, expect, it } from "bun:test";
import { act, render } from "@testing-library/react";
import { AuthNotice } from "@/app/_components/auth-notice";
import {
  EMAIL_TAKEN_LINE,
  LOCALIZATION,
  WRONG_PASSWORD_LINE,
} from "@/app/_lib/auth-localization";
import { showAuthMessage, toAuthMessage } from "@/app/_lib/auth-notice";

afterEach(() => showAuthMessage(null));

// What Neon's sign-up answers for an email that has an account, read from its API on the test
// project (2026-11-21). The kit's toast carries the message, in Neon's English.
const NEON_ANSWER = {
  code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
  message: "User already exists. Use another email.",
} as const;

describe("an email that already has an account", () => {
  it("is worded as That email already has an account., from Neon's message or its code", () => {
    expect(
      toAuthMessage({ variant: "error", message: NEON_ANSWER.message }),
    ).toEqual({ variant: "error", message: EMAIL_TAKEN_LINE });
    expect(
      toAuthMessage({ variant: "error", message: "User already exists" })
        ?.message,
    ).toBe(EMAIL_TAKEN_LINE);
    expect(LOCALIZATION[NEON_ANSWER.code]).toBe(
      "That email already has an account.",
    );
  });

  it("shows that line with Sign in instead, which goes to sign-in", () => {
    const view = render(
      <AuthNotice signInHref="/auth/sign-in?redirectTo=%2Fyou" />,
    );
    expect(view.container.textContent).toBe("");
    act(() =>
      showAuthMessage(
        toAuthMessage({
          variant: "error",
          message: LOCALIZATION[NEON_ANSWER.code],
        }),
      ),
    );
    expect(view.getByRole("alert").textContent).toContain(
      "That email already has an account.",
    );
    expect(
      view.getByRole("link", { name: "Sign in instead" }).getAttribute("href"),
    ).toBe("/auth/sign-in?redirectTo=%2Fyou");
  });

  it("offers Sign in instead for nothing else the kit says", () => {
    const view = render(<AuthNotice signInHref="/auth/sign-in" />);
    act(() =>
      showAuthMessage(
        toAuthMessage({
          variant: "error",
          message: "That password doesn’t match.",
        }),
      ),
    );
    expect(view.getByRole("alert").textContent).toBe(
      "That password doesn’t match.",
    );
    expect(view.queryByRole("link") === null).toBe(true);
  });

  it("words a wrong password as A8 draws it, from Neon's message or its code", () => {
    expect(
      toAuthMessage({ variant: "error", message: "Invalid email or password" }),
    ).toEqual({ variant: "error", message: WRONG_PASSWORD_LINE });
    expect(LOCALIZATION.INVALID_EMAIL_OR_PASSWORD).toBe(
      "That password doesn’t match this email.",
    );
  });

  it("shows a plain message from the kit as a status line", () => {
    const view = render(<AuthNotice signInHref="/auth/sign-in" />);
    act(() => showAuthMessage(toAuthMessage({ message: "Email verified." })));
    expect(view.getByRole("status").textContent).toBe("Email verified.");
    expect(toAuthMessage({ variant: "error" })).toBeNull();
  });
});
