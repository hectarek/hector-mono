import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { RecipeVideo } from "@/app/_components/recipe-video";

// P24.3, D81: the video takes the photo's place and loads only when tapped.
describe("RecipeVideo", () => {
  it("plays a YouTube video in place of the photo, once tapped", async () => {
    const user = userEvent.setup();
    const view = render(
      <RecipeVideo link="https://youtu.be/dQw4w9WgXcQ" title="Chili">
        <p>The photo</p>
      </RecipeVideo>,
    );
    expect(view.getByText("The photo")).toBeTruthy();
    expect(view.container.querySelector("iframe")).toBe(null);

    await user.click(view.getByRole("button", { name: "Play video" }));
    expect(view.queryByText("The photo")).toBe(null);
    expect(view.getByTitle("Video: Chili").getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
    );
  });

  // D88: a hidden page keeps playing its video (display: none doesn't stop it), so the
  // player goes when you leave, and the photo is back when you return.
  it("stops the video when you leave the page", async () => {
    const user = userEvent.setup();
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <RecipeVideo link="https://youtu.be/dQw4w9WgXcQ" title="Chili">
          <p>The photo</p>
        </RecipeVideo>
      </Activity>
    );
    const view = render(page("visible"));
    await user.click(view.getByRole("button", { name: "Play video" }));
    expect(view.container.querySelector("iframe")).not.toBe(null);

    view.rerender(page("hidden"));
    expect(view.container.querySelector("iframe")).toBe(null);
    view.rerender(page("visible"));
    expect(view.getByText("The photo")).toBeTruthy();
  });

  it("opens a video that won't play here on its own page", () => {
    const link = "https://www.instagram.com/reel/Cxyz123/";
    const view = render(
      <RecipeVideo link={link} title="Chili">
        <p>The photo</p>
      </RecipeVideo>,
    );
    expect(view.getByText("The photo")).toBeTruthy();
    const watch = view.getByRole("button", { name: "Watch video" });
    expect(watch.getAttribute("href")).toBe(link);
    expect(watch.getAttribute("target")).toBe("_blank");
  });
});
