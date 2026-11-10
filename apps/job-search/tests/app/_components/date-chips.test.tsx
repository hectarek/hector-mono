import { afterEach, describe, expect, it } from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { DateChips } from "@/app/_components/date-chips";
import { APP_TOASTER } from "@/app/_lib/notify";
import { addPerson, getPerson } from "@/app/actions/people";
import { getInjection } from "@/di/container";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const OWNER = TEST_ACCOUNTS.owner.user.id;

// A person whose step has no date, as the import left some before every step carried one.
async function anUndatedPerson() {
  signInAs("owner");
  const name = `Ada ${crypto.randomUUID().slice(0, 8)}`;
  const { id } = dataOf(await addPerson({ name }));
  return getInjection("ITransactionManagerService").startTransaction((tx) =>
    getInjection("IPeopleRepository").update(
      OWNER,
      id,
      { nextStep: "Ask for an intro", nextDate: null },
      tx,
    ),
  );
}

const personOf = async (id: string) => dataOf(await getPerson({ id })).person;

// Sonner keeps its toasts in a store of its own, which outlives a test's render.
afterEach(() => {
  toast.dismiss();
});

// The UX plan's UX6: a step with no date joins Today in one tap.
describe("a step's date chips", () => {
  it("date the step in one tap, against the updatedAt the list read, and say so", async () => {
    const ada = await anUndatedPerson();
    render(
      <>
        <DateChips kind="person" record={ada} name={ada.name} />
        <Toaster id={APP_TOASTER} />
      </>,
    );
    const weekOut = addDays(todayIn(PLAN_TIME_ZONE), 7);

    fireEvent.click(screen.getByRole("button", { name: /^In a week/ }));

    await waitFor(async () =>
      expect((await personOf(ada.id)).nextDate).toBe(weekOut),
    );
    await screen.findByText(new RegExp(`^${ada.name}: Ask for an intro`));
  });

  it("say the person changed, and date nothing, when they changed since the list read them", async () => {
    const ada = await anUndatedPerson();
    signInAs("owner");
    const { updatedAt } = await getInjection("IUpdatePersonController")(
      { id: ada.id, updatedAt: ada.updatedAt.toISOString(), rank: "A" },
      { actor: "owner", ownerId: OWNER },
    );
    render(
      <>
        <DateChips kind="person" record={ada} name={ada.name} />
        <Toaster id={APP_TOASTER} />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Tomorrow/ }));

    await screen.findByText(
      `${ada.name} changed since this list loaded. Here it is as it is now.`,
    );
    expect(await personOf(ada.id)).toMatchObject({
      nextDate: null,
      updatedAt,
    });
  });
});
