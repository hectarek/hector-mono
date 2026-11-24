import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

// happy-dom has no image decoder, so the shrink stands in: it answers a JPEG holding the name of
// the file it was given, which tells the tests which photo the form sent.
mock.module("@/app/_lib/shrink-image", () => ({
  shrinkImage: async (file: File) =>
    new Blob([file.name], { type: "image/jpeg" }),
}));

const { fireEvent, render, waitFor } = await import("@testing-library/react");
const { PhotoField } = await import("@/app/_components/photo-field");
const { ProfileForm } = await import("@/app/_components/profile-form");

type Action = Parameters<typeof ProfileForm>[0]["action"];

const PICTURE = "https://lh3.googleusercontent.com/a/robin-vale=s400-c";
const INITIAL = {
  name: "Robin Vale",
  phone: "",
  shape: "pawn",
  color: "mustard",
} as const;

const realFetch = globalThis.fetch;
let asked: string[] = [];
// Google's picture host, answering a picture, or failing.
function pictureHost(answer: () => Promise<Response>) {
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    asked.push(String(input));
    return answer();
  }) as unknown as typeof fetch;
}
const aPicture = async () =>
  new Response(new Blob([new Uint8Array(64)], { type: "image/png" }));

// What the form sent as its photo: the name the stand-in shrink wrote into it, or nothing.
async function sentPhoto(data: FormData | undefined): Promise<string | null> {
  const photo = data?.get("photo");
  return photo instanceof File && photo.size > 0 ? await photo.text() : null;
}

function a4(startingPhoto: string | null) {
  const sent: FormData[] = [];
  const action: Action = async (_state, formData) => {
    sent.push(formData);
    return { message: "Profile saved." };
  };
  const view = render(
    <ProfileForm
      mode="start"
      action={action}
      initial={INITIAL}
      startingPhoto={startingPhoto}
      taken={[]}
    />,
  );
  const next = () =>
    fireEvent.submit(
      view
        .getByRole("button", { name: "Next" })
        .closest("form") as HTMLFormElement,
    );
  const input = view.container.querySelector<HTMLInputElement>(
    'input[type="file"][name="photo"]',
  ) as HTMLInputElement;
  return { view, sent, next, input };
}

const photoShown = (view: ReturnType<typeof render>) =>
  view.container.querySelector("img") !== null;

// The picker as a phone's: the file goes into the field's own list, then the field changes.
// (fireEvent's `target: { files }` pins `files` on the element, so the field's own later writes
// would never reach the form.)
function choose(input: HTMLInputElement, name: string) {
  const files = new DataTransfer();
  files.items.add(new File(["x"], name, { type: "image/jpeg" }));
  input.files = files.files;
  fireEvent.change(input);
}

// The picker cancelled, as Chrome does it: the field empties, then changes.
function cancel(input: HTMLInputElement) {
  input.value = "";
  fireEvent.change(input);
}

describe("A4's photo, from a Google sign-up's picture", () => {
  beforeEach(() => {
    asked = [];
    pictureHost(aPicture);
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("starts as the picture, as if chosen, and Next sends it like a chosen photo", async () => {
    const { view, sent, next } = a4(PICTURE);
    await waitFor(() => expect(photoShown(view)).toBe(true));
    expect(asked).toEqual([PICTURE]);
    expect(view.getByRole("button", { name: "Remove photo" })).toBeTruthy();

    next();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(await sentPhoto(sent[0])).toBe("picture");
    const photo = sent[0]?.get("photo");
    expect(photo instanceof File && photo.type).toBe("image/jpeg");
  });

  it("goes with Remove photo, and Next then sends none", async () => {
    const { view, sent, next } = a4(PICTURE);
    await waitFor(() => expect(photoShown(view)).toBe(true));

    fireEvent.click(view.getByRole("button", { name: "Remove photo" }));
    expect(photoShown(view)).toBe(false);
    expect(view.queryByRole("button", { name: "Remove photo" }) === null).toBe(
      true,
    );

    next();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(await sentPhoto(sent[0])).toBeNull();
  });

  it("gives way to a photo they choose", async () => {
    const { view, sent, next, input } = a4(PICTURE);
    await waitFor(() => expect(photoShown(view)).toBe(true));

    choose(input, "chosen.jpg");
    await waitFor(async () =>
      expect(await sentPhoto(new FormData(input.form ?? undefined))).toBe(
        "chosen.jpg",
      ),
    );

    next();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(await sentPhoto(sent[0])).toBe("chosen.jpg");
  });

  it("stays out when they choose a photo before it arrives", async () => {
    let arrive: (response: Response) => void = () => {};
    pictureHost(
      () =>
        new Promise<Response>((resolve) => {
          arrive = resolve;
        }),
    );
    const { sent, next, input } = a4(PICTURE);
    choose(input, "chosen.jpg");
    await waitFor(() => expect(asked).toEqual([PICTURE]));
    arrive(await aPicture());
    await new Promise((settle) => setTimeout(settle, 20));

    next();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(await sentPhoto(sent[0])).toBe("chosen.jpg");
  });

  // Chrome empties a file field whose picker is cancelled.
  it("stays when they open the picker and cancel", async () => {
    const { view, sent, next, input } = a4(PICTURE);
    await waitFor(() => expect(photoShown(view)).toBe(true));

    cancel(input);
    expect(input.files?.length).toBe(1);

    next();
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(await sentPhoto(sent[0])).toBe("picture");
  });

  it("leaves the photo empty when Google's picture can't be fetched", async () => {
    pictureHost(async () => {
      throw new TypeError("Failed to fetch");
    });
    const { view } = a4(PICTURE);
    await waitFor(() => expect(asked).toEqual([PICTURE]));
    await new Promise((settle) => setTimeout(settle, 20));
    expect(photoShown(view)).toBe(false);
    expect(view.queryByRole("button", { name: "Remove photo" }) === null).toBe(
      true,
    );
  });

  it("asks for nothing for an email sign-up, which starts empty", async () => {
    const { view } = a4(null);
    await new Promise((settle) => setTimeout(settle, 20));
    expect(asked).toEqual([]);
    expect(photoShown(view)).toBe(false);
  });
});

describe("PhotoField without Remove photo", () => {
  // E6 removes a saved photo itself, and a game's photo has no Remove photo.
  it("shows none under a chosen photo", async () => {
    const view = render(<PhotoField name="photo" />);
    const input = view.container.querySelector<HTMLInputElement>(
      'input[type="file"][name="photo"]',
    ) as HTMLInputElement;
    choose(input, "box.jpg");
    await waitFor(() => expect(photoShown(view)).toBe(true));
    expect(view.queryByRole("button", { name: "Remove photo" }) === null).toBe(
      true,
    );
  });
});
