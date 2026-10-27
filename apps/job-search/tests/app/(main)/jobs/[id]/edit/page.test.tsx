import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import EditJobPage from "@/app/(main)/jobs/[id]/edit/page";
import { NotFoundPage } from "@/tests/_support/next";
import { aCompany, aJob } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

describe("editing a job", () => {
  it("opens Claude's session on the job as it is", async () => {
    const job = await aJob(await aCompany(), { location: "Springfield" });

    signInAs("agent");
    const page = within(
      await renderOnServer(
        await EditJobPage({ params: Promise.resolve({ id: job.id }) }),
      ),
    );

    expect(
      page.getByRole("heading", { name: "Edit Widget engineer" }),
    ).toBeTruthy();
    expect(page.getByLabelText("Location")).toHaveProperty(
      "value",
      "Springfield",
    );
    expect(page.getByLabelText("Source")).toHaveProperty("value", "Referral");
  });

  it("is not found for an unknown job", async () => {
    signInAs("owner");
    expect(
      await EditJobPage({
        params: Promise.resolve({ id: crypto.randomUUID() }),
      }).catch((err: unknown) => err),
    ).toBeInstanceOf(NotFoundPage);
  });
});
