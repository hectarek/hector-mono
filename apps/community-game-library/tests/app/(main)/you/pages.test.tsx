import { beforeEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import EditProfilePage from "@/app/(main)/you/edit/page";
import YouPage from "@/app/(main)/you/page";
import { updateProfile } from "@/app/actions/profile";
import { form } from "@/tests/_support/form";
import { signInAsMember } from "@/tests/_support/members";
import { nextState, Redirected, signInAsNewUser } from "@/tests/_support/next";

describe("E5, You", () => {
  beforeEach(async () => {
    await signInAsMember({ name: "Quinn Sample", phone: "555 0123" });
  });

  it("shows the member's name, piece and phone, with Edit profile and Sign out", async () => {
    const view = render(await YouPage());
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "Quinn Sample",
    );
    expect(
      view
        .getByRole("button", { name: "Edit profile and piece" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/you/edit");
    expect(view.getByText("555 0123")).toBeTruthy();
    expect(
      view.getByRole("link", { name: "Sign out" }).getAttribute("href"),
    ).toBe("/auth/sign-out");
    expect(view.getByText("Signed in as test@example.com")).toBeTruthy();
    // The piece is the one they picked.
    expect(
      view.container.querySelector('path[data-color="teal"]'),
    ).not.toBeNull();
    expect(
      view.getByRole("link", { name: /home screen/ }).getAttribute("href"),
    ).toBe("/start/home-screen?from=you");
  });

  it("has only the rows whose pages exist so far, Notices I get among them (U11)", async () => {
    const view = render(await YouPage());
    for (const name of [/Admin/, /Delete my account/]) {
      expect(view.queryByRole("link", { name }) === null).toBe(true);
    }
    expect(
      view.getByRole("link", { name: "Notices I get" }).getAttribute("href"),
    ).toBe("/you/notices");
  });

  it("shows no phone line without a phone", async () => {
    await signInAsMember({ phone: null });
    const view = render(await YouPage());
    expect(view.queryByText(/Only your friends/) === null).toBe(true);
  });

  it("shows the photo through a signed address", async () => {
    const photo = new File([new Uint8Array(10)], "photo.jpg", {
      type: "image/jpeg",
    });
    const data = form({
      name: "Quinn Sample",
      pieceShape: "cone",
      pieceColor: "teal",
    });
    data.append("photo", photo);
    await updateProfile(null, data);
    const view = render(await YouPage());
    const picture = view.container.querySelector("img");
    expect(picture?.getAttribute("src")).toMatch(
      /^https:\/\/storage\.test\/profile-photos\/.+\?expires-in=3600$/,
    );
  });

  it("sends a signed-out visit to the welcome page, and a new account to set up", async () => {
    nextState.userId = undefined;
    expect(await YouPage().catch((err: unknown) => err)).toBeInstanceOf(
      Redirected,
    );
    signInAsNewUser();
    const err = await YouPage().catch((caught: unknown) => caught);
    expect((err as Redirected).url).toBe("/start/profile");
  });
});

describe("E6, Edit profile", () => {
  beforeEach(async () => {
    await signInAsMember({ name: "Quinn Sample", phone: "555 0123" });
  });

  it("is A4's form with the profile as it is, and Save", async () => {
    const view = render(await EditProfilePage());
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "Edit profile",
    );
    expect((view.getByLabelText("Name") as HTMLInputElement).value).toBe(
      "Quinn Sample",
    );
    expect((view.getByLabelText(/Phone/) as HTMLInputElement).value).toBe(
      "555 0123",
    );
    expect(
      view.getByRole("radio", { name: "cone" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      view.getByRole("radio", { name: "teal" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(view.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(
      view.getByRole("link", { name: "Back to You" }).getAttribute("href"),
    ).toBe("/you");
  });
});
