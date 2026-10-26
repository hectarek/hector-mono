import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { NotFoundError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import {
  type CompanyRef,
  companyFacts,
} from "@/src/entities/models/company.model";

export type IDeleteCompanyUseCase = ReturnType<typeof deleteCompanyUseCase>;

// Deletes a company, which only Hector may do (R21): Claude's try is refused, and logged, before
// anything is read. The history keeps the company's facts as they were.
export const deleteCompanyUseCase = (
  companiesRepository: ICompaniesRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "deleteCompany",
  });

  return async (
    context: ChangeContext,
    { id }: { id: string },
  ): Promise<CompanyRef> => {
    const record: RecordRef = { kind: "company", id };
    await requireHuman(activityRepository, transactionManager, context, {
      record,
      operation: "delete",
    });
    const deleted = await transactionManager.startTransaction(async (tx) => {
      const company = await companiesRepository.getForUpdate(
        context.ownerId,
        id,
        tx,
      );
      if (!company) {
        throw new NotFoundError("Couldn't find that company.");
      }
      await companiesRepository.delete(context.ownerId, id, tx);
      await recordChange(activityRepository, tx, context, {
        record,
        action: "deleted",
        before: companyFacts(company),
      });
      return { id, name: company.name };
    });
    logger.info("Company deleted", { companyId: id });
    return deleted;
  };
};
