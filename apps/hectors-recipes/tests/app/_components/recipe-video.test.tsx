import { describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
