import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { Cover } from "@/app/_components/cover";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Stamp } from "@/app/_components/stamp";

const token = (container: HTMLElement) =>
  container.querySelector("[data-color]")?.getAttribute("data-color");

// Y1: the game's token until its art loads, the art once it does, and the token again if the art
// fails, so a cover never shows a broken picture or an empty box.
describe("CoverThumb", () => {
  it("shows the game's token when there's no art", () => {
    const view = render(<CoverThumb color="mustard" />);
    expect(token(view.container)).toBe("mustard");
    expect(view.container.querySelector("img") === null).toBe(true);
  });

  it("rings an empty token while the art loads, shows the art, or falls back to the token", async () => {
    const view = render(
      <CoverThumb color="ocean" imageUrl="https://example.test/box.jpg" />,
    );
    const art = view.container.querySelector("img");
    if (!art) throw new Error("No art drawn");
    expect(token(view.container)).toBeUndefined();
    expect(art.className).toContain("opacity-0");

    // next/image calls onLoad once the picture has decoded, a moment after the load event.
    fireEvent.load(art);
    await waitFor(() =>
      expect(art.className.includes("opacity-0")).toBe(false),
    );

    fireEvent.error(art);
    expect(view.container.querySelector("img") === null).toBe(true);
    expect(token(view.container)).toBe("ocean");
  });
});

describe("Cover", () => {
  it("is the token and the title in stencil without art, with the member's stamp", () => {
    const view = render(
      <Cover
        title="Harbor Lights"
        color="mustard"
        stamp={<Stamp size="card">Available</Stamp>}
      />,
    );
    expect(token(view.container)).toBe("mustard");
    expect(view.getByText("Harbor Lights").getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(view.getByText("Available")).toBeTruthy();
  });

  it("falls back to the token and title when the art fails", () => {
    const view = render(
      <Cover
        title="Harbor Lights"
        color="moss"
        imageUrl="https://example.test/a.jpg"
      />,
    );
    expect(view.queryByText("Harbor Lights") === null).toBe(true);
    const art = view.container.querySelector("img");
    if (!art) throw new Error("No art drawn");
    fireEvent.error(art);
    expect(view.getByText("Harbor Lights")).toBeTruthy();
    expect(token(view.container)).toBe("moss");
  });

  it("credits the art under the tile, linked to its page, until the art fails", () => {
    const view = render(
      <Cover
        title="Harbor Lights"
        color="moss"
        imageUrl="https://example.test/a.jpg"
        imageCredit="Ines Varga, CC BY-SA 4.0"
        imageSourceUrl="https://example.test/file-page"
      />,
    );
    const credit = view.getByRole("link", { name: "Ines Varga, CC BY-SA 4.0" });
    expect(credit.getAttribute("href")).toBe("https://example.test/file-page");
    expect(credit.parentElement?.textContent).toBe(
      "Image: Ines Varga, CC BY-SA 4.0",
    );

    const art = view.container.querySelector("img");
    if (!art) throw new Error("No art drawn");
    fireEvent.error(art);
    expect(view.queryByText(/Ines Varga/) === null).toBe(true);
  });

  it("gives a credit without a page as plain words, and none without art", () => {
    const credited = render(
      <Cover
        title="Harbor Lights"
        color="moss"
        imageUrl="https://example.test/a.jpg"
        imageCredit="Public domain"
      />,
    );
    expect(credited.getByText("Image: Public domain")).toBeTruthy();
    expect(credited.queryByRole("link") === null).toBe(true);
    credited.unmount();

    const tokenOnly = render(
      <Cover title="Harbor Lights" color="moss" imageCredit="Public domain" />,
    );
    expect(tokenOnly.queryByText(/Public domain/) === null).toBe(true);
  });
});
