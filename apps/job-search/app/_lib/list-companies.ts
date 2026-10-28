import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  COMPANY_PAGE_MAX,
  type CompanyRef,
} from "@/src/entities/models/company.model";

// The most companies a picker lists: past this, Hector finds a company by searching its page.
const PICKER_MAX = 500;

// Every company by name, a page at a time, for a form that picks one (a person's company).
export async function listCompanies(
  actor: CurrentActor,
): Promise<CompanyRef[]> {
  const find = getInjection("IFindCompaniesController");
  const companies: CompanyRef[] = [];
  let offset: number | null = 0;
  while (offset !== null && companies.length < PICKER_MAX) {
    const page = await find({ limit: COMPANY_PAGE_MAX, offset }, actor);
    companies.push(...page.companies.map(({ id, name }) => ({ id, name })));
    offset = page.nextOffset;
  }
  return companies;
}
