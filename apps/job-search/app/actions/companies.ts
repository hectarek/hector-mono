"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type {
  CompanyDetail,
  CompanyPage,
  CompanyRef,
  SavedCompany,
} from "@/src/entities/models/company.model";

// Companies (docs/build-plan.md U5): plain-argument actions that answer an envelope and never
// redirect (KTD4). find_companies, get_company and save_company call the first three once U4's
// gate passes; deleting is Hector's alone (R21), from a company's page.

// The owner's companies by name, a page at a time.
export async function findCompanies(
  input: unknown,
): Promise<ActionResult<CompanyPage>> {
  return answer(
    "findCompanies",
    "Couldn't list the companies. Try again.",
    async () =>
      getInjection("IFindCompaniesController")(input, await getActionActor()),
  );
}

// A company, with any company whose name matches its own.
export async function getCompany(
  input: unknown,
): Promise<ActionResult<CompanyDetail>> {
  return answer(
    "getCompany",
    "Couldn't read the company. Try again.",
    async () =>
      getInjection("IGetCompanyController")(input, await getActionActor()),
  );
}

// A new company, or a change to one made against the updatedAt read with it. `tool` is the page
// tool's name.
export async function saveCompany(
  input: unknown,
  tool?: string,
): Promise<ActionResult<SavedCompany>> {
  return answer(
    "saveCompany",
    "Couldn't save the company. Try again.",
    async () =>
      getInjection("ISaveCompanyController")(input, await changeContext(tool)),
    (saved) => companyPages(saved.company.id),
  );
}

export async function deleteCompany(
  input: unknown,
): Promise<ActionResult<CompanyRef>> {
  return answer(
    "deleteCompany",
    "Couldn't delete the company. Try again.",
    async () =>
      getInjection("IDeleteCompanyController")(input, await changeContext()),
    (deleted) => companyPages(deleted.id),
  );
}

// The pages that show a company, and Claude's page, which lists its changes.
function companyPages(id: string): string[] {
  return ["/companies", `/companies/${id}`, "/agent"];
}
