import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import {
  ProfileForm,
  type ProfileValues,
} from "@/app/_components/profile-form";
import type { ActionState } from "@/app/actions/shared";
import { CAST } from "@/tests/_support/cast";
import { nextState } from "@/tests/_support/next";

const INITIAL: ProfileValues = {
  name: "Robin Vale",
  phone: "",
  shape: "pawn",
  color: "mustard",
};
const ALICE = CAST.people.alice;
const SAM = CAST.people.sam;
const taken = [ALICE, SAM].map((person) => ({
  userId: person.id,
  name: person.name,
  pieceShape: person.pieceShape,
  pieceColor: person.pieceColor,
}));

// An action that records what the form sent, and answers as given.
function recording(answer: ActionState) {
  const sent: FormData[] = [];
  const action = async (_state: ActionState, formData: FormData) => {
    sent.push(formData);
    return answer;
  };
  return { sent, action };
}

const radio = (view: ReturnType<typeof render>, name: string) =>
  view.getByRole("radio", { name });

describe("ProfileForm", () => {
  beforeEach(() => {
    nextState.pushed = [];
  });

  describe("as A4 (setting up)", () => {
    it("picks a piece and saves it, then goes on to the home-screen step", async () => {
      const { sent, action } = recording({ message: "Profile saved." });
      const view = render(
        <ProfileForm
          mode="start"
          action={action}
          initial={INITIAL}
          taken={[]}
        />,
      );

      fireEvent.click(radio(view, "cone"));
      fireEvent.click(radio(view, "teal"));
      fireEvent.change(view.getByLabelText("Name"), {
        target: { value: "Robin V." },
      });
      fireEvent.change(view.getByLabelText(/Phone/), {
        target: { value: "555 0199" },
      });
      fireEvent.submit(
        view
          .getByRole("button", { name: "Next" })
          .closest("form") as HTMLFormElement,
      );

      await waitFor(() => expect(sent).toHaveLength(1));
      const data = sent[0];
      expect(data?.get("name")).toBe("Robin V.");
      expect(data?.get("phone")).toBe("555 0199");
      expect(data?.get("pieceShape")).toBe("cone");
      expect(data?.get("pieceColor")).toBe("teal");
      await waitFor(() =>
        expect(nextState.pushed).toEqual(["/start/home-screen"]),
      );
    });

    it("has the one main action, Next, and no Save", () => {
      const view = render(
        <ProfileForm
          mode="start"
          action={recording(null).action}
          initial={INITIAL}
          taken={[]}
        />,
      );
      expect(view.getByRole("button", { name: "Next" })).toBeTruthy();
      expect(view.queryByRole("button", { name: "Save" }) === null).toBe(true);
    });

    it("draws 'Taken by your friends' only when friends have pieces", () => {
      const none = render(
        <ProfileForm
          mode="start"
          action={recording(null).action}
          initial={INITIAL}
          taken={[]}
        />,
      );
      expect(none.queryByText("Taken by your friends") === null).toBe(true);
      none.unmount();

      const some = render(
        <ProfileForm
          mode="start"
          action={recording(null).action}
          initial={INITIAL}
          taken={taken}
        />,
      );
      expect(some.getByText("Taken by your friends")).toBeTruthy();
      expect(some.getByText("Alice")).toBeTruthy();
      expect(some.getByText("Sam")).toBeTruthy();
      expect(
        some.getByText(
          "Two friends can share a piece. Names always show beside it.",
        ),
      ).toBeTruthy();
    });

    it("says what to fix under the field, and keeps what was typed", async () => {
      const { action } = recording({
        error: "Name is required",
        fields: { name: "Name is required" },
      });
      const view = render(
        <ProfileForm
          mode="start"
          action={action}
          initial={INITIAL}
          taken={[]}
        />,
      );
      fireEvent.change(view.getByLabelText("Name"), { target: { value: "" } });
      fireEvent.change(view.getByLabelText(/Phone/), {
        target: { value: "555 0100" },
      });
      fireEvent.submit(
        view
          .getByRole("button", { name: "Next" })
          .closest("form") as HTMLFormElement,
      );

      await waitFor(() =>
        expect(view.getByText("Name is required")).toBeTruthy(),
      );
      expect((view.getByLabelText(/Phone/) as HTMLInputElement).value).toBe(
        "555 0100",
      );
      expect(nextState.pushed).toEqual([]);
    });

    it("says a photo that failed under Photo", async () => {
      const line = "That photo didn’t upload. Try a smaller one.";
      const { action } = recording({ error: line, fields: { photo: line } });
      const view = render(
        <ProfileForm
          mode="start"
          action={action}
          initial={INITIAL}
          taken={[]}
        />,
      );
      fireEvent.submit(
        view
          .getByRole("button", { name: "Next" })
          .closest("form") as HTMLFormElement,
      );
      await waitFor(() => expect(view.getByText(line)).toBeTruthy());
    });
  });

  describe("as E6 (editing)", () => {
    it("saves, and goes back to You", async () => {
      const { sent, action } = recording({ message: "Profile saved." });
      const view = render(
        <ProfileForm
          mode="edit"
          action={action}
          initial={INITIAL}
          taken={taken}
        />,
      );
      expect(view.queryByRole("button", { name: "Next" }) === null).toBe(true);
      fireEvent.click(radio(view, "ship"));
      fireEvent.submit(
        view
          .getByRole("button", { name: "Save" })
          .closest("form") as HTMLFormElement,
      );

      await waitFor(() => expect(sent).toHaveLength(1));
      expect(sent[0]?.get("pieceShape")).toBe("ship");
      expect(sent[0]?.get("pieceColor")).toBe("mustard");
      await waitFor(() => expect(nextState.pushed).toEqual(["/you"]));
    });

    it("shows the profile as it is, and the photo it has with a way to remove it", () => {
      const view = render(
        <ProfileForm
          mode="edit"
          action={recording(null).action}
          initial={{
            ...INITIAL,
            phone: "555 0199",
            shape: "house",
            color: "plum",
          }}
          photoUrl="about:blank"
          removePhoto={async () => null}
          taken={[]}
        />,
      );
      expect((view.getByLabelText("Name") as HTMLInputElement).value).toBe(
        "Robin Vale",
      );
      expect((view.getByLabelText(/Phone/) as HTMLInputElement).value).toBe(
        "555 0199",
      );
      expect(radio(view, "house").getAttribute("aria-checked")).toBe("true");
      expect(radio(view, "plum").getAttribute("aria-checked")).toBe("true");
      expect(view.getByRole("button", { name: "Remove photo" })).toBeTruthy();
    });

    it("has no Remove photo without a photo", () => {
      const view = render(
        <ProfileForm
          mode="edit"
          action={recording(null).action}
          initial={INITIAL}
          taken={[]}
        />,
      );
      expect(
        view.queryByRole("button", { name: "Remove photo" }) === null,
      ).toBe(true);
    });
  });
});
