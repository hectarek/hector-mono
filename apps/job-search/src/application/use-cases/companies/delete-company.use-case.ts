import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import {
  type CompanyRef,
  companyFacts,
} from "@/src/entities/models/company.model";
import type { ReviewState } from "@/src/entities/models/job.model";

export type IDeleteCompanyUseCase = ReturnType<typeof deleteCompanyUseCase>;

// What keeps a company from its delete, one review state at a time: "a job", "2 proposals".
const HELD: Record<ReviewState, [one: string, many: string]> = {
  accepted: ["a job", "jobs"],
  pending: ["a proposal", "proposals"],
  dismissed: ["a dismissed proposal", "dismissed proposals"],
};

// "a job and a proposal": en-GB lists without the serial comma, as the app's copy does.
const LIST = new Intl.ListFormat("en-GB", { type: "conjunction" });

// Deletes a company, which only Hector may do (R21): Claude's try is refused, and logged, before
// anything is read. A company that has jobs is refused, naming them: they'd lose their employer.
// Proposals count too, dismissed ones included, since a dismissed proposal is what keeps its
// posting from coming back (R20). The history keeps the company's facts as they were.
export const deleteCompanyUseCase = (
  companiesRepository: ICompaniesRepository,
  jobsRepository: IJobsRepository,
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
      const counts = await jobsRepository.countForCompany(
        context.ownerId,
        id,
        tx,
      );
      const held = (Object.keys(HELD) as ReviewState[])
        .filter((state) => counts[state] > 0)
        .map((state) =>
          counts[state] === 1
            ? HELD[state][0]
            : `${counts[state]} ${HELD[state][1]}`,
        );
      if (held.length) {
        const total = counts.accepted + counts.pending + counts.dismissed;
        throw new InputParseError(
          `${company.name} has ${LIST.format(held)}. Delete ${total === 1 ? "it" : "them"} first.`,
        );
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
