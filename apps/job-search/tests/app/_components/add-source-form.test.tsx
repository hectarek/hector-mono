import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { AddSourceForm } from "@/app/_components/add-source-form";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { signInAs } from "@/tests/_support/session";

const HECTOR: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

const add = (view: ReturnType<typeof render>, name: string) => {
  fireEvent.change(view.getByLabelText("New source's name"), {
    target: { value: name },
  });
  const form = view.container.querySelector("form");
  if (!form) throw new Error("No form");
  fireEvent.submit(form);
};

describe("adding a lead source", () => {
  it("adds the source and clears the box, and says so when the name is already listed", async () => {
    signInAs("owner");
    const name = `Widget Jobs ${crypto.randomUUID().slice(0, 8)}`;
    const view = render(<AddSourceForm />);

    add(view, name);
    await waitFor(() =>
      expect(view.getByLabelText("New source's name")).toHaveProperty(
        "value",
        "",
      ),
    );
    expect(
      (await getInjection("IListSourcesController")(HECTOR)).map(
        (source) => source.name,
      ),
    ).toContain(name);

    add(view, name.toUpperCase());
    expect(await view.findByText(`Already listed as ${name}.`)).toBeTruthy();
  });
});
