import { describe, expect, it } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { PhotoField } from "@/app/_components/photo-field";

const FAILED = "That photo didn’t upload. Try a smaller one.";

// screens.md, When something goes wrong: "Under Photo: That photo didn't upload. Try a smaller
// one."
describe("PhotoField", () => {
  it("shows its label, that it's optional, and its help", () => {
    const view = render(
      <PhotoField name="photo" optional help="Shown on your page." />,
    );
    expect(view.getByText("Photo").textContent).toBe("Photo · optional");
    expect(view.getByText("Shown on your page.")).toBeTruthy();
    expect(view.getByRole("button", { name: "Choose a photo" })).toBeTruthy();
    expect(view.queryByRole("alert") === null).toBe(true);
  });

  // A photo the phone can't open or shrink isn't sent: here the browser has no image decoder at
  // all, as a desktop browser has none for a phone's HEIC.
  it("says a photo it can't shrink didn't upload, and sends nothing", async () => {
    const view = render(<PhotoField name="photo" />);
    const input = view.container.querySelector<HTMLInputElement>(
      'input[type="file"][name="photo"]',
    );
    if (!input) throw new Error("PhotoField renders no file input");

    const photo = new File([new Uint8Array(2_000_000)], "box.heic", {
      type: "image/heic",
    });
    fireEvent.change(input, { target: { files: [photo] } });

    expect((await view.findByRole("alert")).textContent).toBe(FAILED);
    expect(input.value).toBe("");
  });

  it("shows the action's word on the photo it was sent", () => {
    const view = render(<PhotoField name="photo" error={FAILED} />);
    expect(view.getByRole("alert").textContent).toBe(FAILED);
  });
});
