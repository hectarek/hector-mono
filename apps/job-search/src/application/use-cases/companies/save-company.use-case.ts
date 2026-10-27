import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { ConflictError, NotFoundError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Company,
  type CompanyFacts,
  companyFacts,
  type SaveCompanyRequest,
  type SavedCompany,
} from "@/src/entities/models/company.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

export type ISaveCompanyUseCase = ReturnType<typeof saveCompanyUseCase>;

// Saves a company (save_company, docs/build-plan.md U5): a new one, or a change to the facts
// given, made only against the updatedAt read with it (R22). The write and its history share one
// transaction (KTD7). Either way, the answer lists any other company whose name matches ignoring
// case and punctuation: a warning, never a refusal.
export const saveCompanyUseCase = (
  companiesRepository: ICompaniesRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "saveCompany" });

  return async (
    context: ChangeContext,
    request: SaveCompanyRequest,
  ): Promise<SavedCompany> => {
    const saved = await transactionManager.startTransaction(async (tx) => {
      const company =
        request.kind === "new"
          ? await create(context, request.facts, tx)
          : await change(context, request, tx);
      const similar = await companiesRepository.findSimilar(
        context.ownerId,
        company.name,
        company.id,
        tx,
      );
      return { company, created: request.kind === "new", similar };
    });
    logger.info("Company saved", {
      companyId: saved.company.id,
      created: saved.created,
      similar: saved.similar.length,
    });
    return saved;
  };

  async function create(
    context: ChangeContext,
    facts: CompanyFacts,
    tx: ITransaction,
  ): Promise<Company> {
    const company = await companiesRepository.create(
      context.ownerId,
      facts,
      tx,
    );
    await recordChange(activityRepository, tx, context, {
      record: { kind: "company", id: company.id },
      action: "created",
      after: facts,
    });
    return company;
  }

  async function change(
    context: ChangeContext,
    { id, updatedAt, changes }: Extract<SaveCompanyRequest, { kind: "change" }>,
    tx: ITransaction,
  ): Promise<Company> {
    const current = await companiesRepository.getForUpdate(
      context.ownerId,
      id,
      tx,
    );
    if (!current) {
      throw new NotFoundError("Couldn't find that company.");
    }
    if (current.updatedAt.getTime() !== updatedAt.getTime()) {
      throw new ConflictError(current);
    }
    const changed = differences(current, changes);
    if (Object.keys(changed).length === 0) {
      return current;
    }
    const company = await companiesRepository.update(
      context.ownerId,
      id,
      changed,
      tx,
    );
    await recordChange(activityRepository, tx, context, {
      record: { kind: "company", id },
      action: "updated",
      before: companyFacts(current),
      after: companyFacts(company),
    });
    return company;
  }
};

// The facts given whose values differ from the company's: what the change sets.
function differences(
  company: Company,
  changes: Partial<CompanyFacts>,
): Partial<CompanyFacts> {
  return Object.fromEntries(
    Object.entries(changes).filter(
      ([fact, value]) =>
        value !== undefined && value !== company[fact as keyof CompanyFacts],
    ),
  );
}
