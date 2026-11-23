import { beforeEach, describe, expect, it } from "bun:test";
import { render, within } from "@testing-library/react";
import AboutCatalogPage from "@/app/(main)/you/catalog/page";
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

  it("has the rows whose pages exist: The app's in Y1's order, Delete my account (U22), and Admin only for the admin", async () => {
    const view = render(await YouPage());
    expect(view.queryByRole("link", { name: /Admin/ }) === null).toBe(true);
    const theApp = view.getByRole("heading", { name: "The app" })
      .parentElement as HTMLElement;
    expect(
      within(theApp)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Notices I get", "/you/notices"],
      ["Put the app on my home screen", "/start/home-screen?from=you"],
      ["About the catalog", "/you/catalog"],
    ]);
    // The credit is on About the catalog now, not here (U24).
    expect(view.queryByText(/BoardGameGeek|Game facts from/) === null).toBe(
      true,
    );
    expect(
      view
        .getByRole("link", { name: "Delete my account" })
        .getAttribute("href"),
    ).toBe("/you/delete");
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

describe("About the catalog", () => {
  it("says where the games come from, credits the sources and offers Suggest a game", () => {
    const view = render(AboutCatalogPage());

    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "About the catalog",
    );
    expect(
      view.getByRole("link", { name: "Back to You" }).getAttribute("href"),
    ).toBe("/you");
    expect(
      view.getByText(/published board, card and party games on Wikidata/),
    ).toBeTruthy();
    expect(view.getByText(/^Game facts from/).textContent).toBe(
      "Game facts from Wikidata and Wikipedia.",
    );
    expect(
      ["Wikidata", "Wikipedia"].map((name) =>
        view.getByRole("link", { name }).getAttribute("href"),
      ),
    ).toEqual(["https://www.wikidata.org", "https://en.wikipedia.org"]);
    expect(
      view
        .getByRole("button", { name: "Can’t find a game? Suggest one" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/my-library/suggest");
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
