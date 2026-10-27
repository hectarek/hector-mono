import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { CompanyForm } from "@/app/_components/company-form";
import { saveCompany } from "@/app/actions/companies";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import type { Company } from "@/src/entities/models/company.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

const HECTOR: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

// The test container's companies live for the whole run, so each test names its own.
const fictional = (name: string) =>
  `${name} ${crypto.randomUUID().slice(0, 8)}`;

const companyOf = async (facts: Record<string, unknown>): Promise<Company> => {
  const result = await saveCompany(facts);
  if (!result.ok) throw new Error(`The save failed: ${result.code}`);
  return result.data.company;
};

const read = async (id: string) =>
  (await getInjection("IGetCompanyController")({ id }, HECTOR)).company;

const type = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } });

const submit = (view: ReturnType<typeof render>) => {
  const form = view.container.querySelector("form");
  if (!form) throw new Error("No form");
  fireEvent.submit(form);
};

beforeEach(() => {
  nextState.pushed = [];
});

describe("the company form", () => {
  it("adds a company with what was typed, and opens it", async () => {
    signInAs("owner");
    const name = fictional("Acme Inc");
    const view = render(<CompanyForm />);

    type(view.getByLabelText("Name"), name);
    type(view.getByLabelText("Location"), "Springfield");
    fireEvent.click(view.getByRole("button", { name: "2" }));
    submit(view);

    await waitFor(() => expect(nextState.pushed).toHaveLength(1));
    const id = nextState.pushed[0]?.replace("/companies/", "") ?? "";
    expect(await read(id)).toMatchObject({
      name,
      location: "Springfield",
      tier: 2,
      website: null,
    });
  });

  it("shows what it can't take under the field, and stays", async () => {
    signInAs("owner");
    const view = render(<CompanyForm />);

    type(view.getByLabelText("Name"), fictional("Acme Inc"));
    type(view.getByLabelText("Website"), "ftp://acme.example");
    submit(view);

    expect(
      await view.findAllByText(
        "Use an http or https link, like https://example.com",
      ),
    ).not.toHaveLength(0);
    expect(nextState.pushed).toEqual([]);
  });

  // R22, KTD15: a change made meanwhile is shown, kept, and saved against.
  it("on a conflict, shows the company as it is now with the edits kept, and saves only the edits against it", async () => {
    signInAs("owner");
    const company = await companyOf({
      name: fictional("Fictional Widgets"),
      location: "Springfield",
      industry: "Widgets",
    });
    const view = render(<CompanyForm company={company} />);

    // Claude changes the industry while the form is open.
    signInAs("agent");
    await saveCompany(
      {
        id: company.id,
        updatedAt: company.updatedAt.toISOString(),
        industry: "Gadgets",
      },
      "save_company",
    );

    signInAs("owner");
    type(view.getByLabelText("Location"), "Shelbyville");
    submit(view);

    const notice = await view.findByRole("alert");
    expect(within(notice).getByText("Industry is now Gadgets")).toBeTruthy();
    expect(view.getByLabelText("Industry")).toHaveProperty("value", "Gadgets");
    expect(view.getByLabelText("Location")).toHaveProperty(
      "value",
      "Shelbyville",
    );
    expect(nextState.pushed).toEqual([]);

    submit(view);
    await waitFor(() =>
      expect(nextState.pushed).toEqual([`/companies/${company.id}`]),
    );
    expect(await read(company.id)).toMatchObject({
      location: "Shelbyville",
      industry: "Gadgets",
    });
  });
});
