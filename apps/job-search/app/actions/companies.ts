"use server";

import { revalidatePath } from "next/cache";
import { getActionActor } from "@/app/_lib/current-actor";
import {
  type ActionResult,
  actionLogger,
  changeContext,
  succeeded,
  toActionError,
} from "@/app/actions/shared";
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
  try {
    return succeeded(
      await getInjection("IFindCompaniesController")(
        input,
        await getActionActor(),
      ),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("findCompanies"),
      "Couldn't list the companies. Try again.",
    );
  }
}

// A company, with any company whose name matches its own.
export async function getCompany(
  input: unknown,
): Promise<ActionResult<CompanyDetail>> {
  try {
    return succeeded(
      await getInjection("IGetCompanyController")(
        input,
        await getActionActor(),
      ),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("getCompany"),
      "Couldn't read the company. Try again.",
    );
  }
}

// A new company, or a change to one made against the updatedAt read with it. `tool` is the page
// tool's name.
export async function saveCompany(
  input: unknown,
  tool?: string,
): Promise<ActionResult<SavedCompany>> {
  let saved: SavedCompany;
  try {
    saved = await getInjection("ISaveCompanyController")(
      input,
      await changeContext(tool),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("saveCompany"),
      "Couldn't save the company. Try again.",
    );
  }
  refresh(saved.company.id);
  return succeeded(saved);
}

export async function deleteCompany(
  input: unknown,
): Promise<ActionResult<CompanyRef>> {
  let deleted: CompanyRef;
  try {
    deleted = await getInjection("IDeleteCompanyController")(
      input,
      await changeContext(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("deleteCompany"),
      "Couldn't delete the company. Try again.",
    );
  }
  refresh(deleted.id);
  return succeeded(deleted);
}

// The pages that show a company, and Claude's page, which lists its changes.
function refresh(id: string): void {
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  revalidatePath("/agent");
}
