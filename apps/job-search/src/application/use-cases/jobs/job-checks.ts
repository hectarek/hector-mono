import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import { DuplicateError, NotFoundError } from "@/src/entities/errors/common";
import type { DuplicateJob } from "@/src/entities/models/job.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Checks a job's write makes inside its transaction (docs/build-plan.md U6).

// Refuses a posting already on another job, whatever its review (R20, KTD8), naming that job and,
// when dismissed, why. Take the queue's lock first, so a write started meanwhile waits.
export async function refuseDuplicate(
  jobsRepository: IJobsRepository,
  ownerId: string,
  postingKey: string,
  tx: ITransaction,
  exceptId?: string,
): Promise<void> {
  const existing = await jobsRepository.findByPostingKey(
    ownerId,
    postingKey,
    tx,
  );
  if (existing && existing.id !== exceptId) {
    throw new DuplicateError(existing, duplicateMessage(existing));
  }
}

function duplicateMessage({
  role,
  company,
  reviewState,
  dismissReason,
}: DuplicateJob): string {
  const job = `${role} at ${company}`;
  if (reviewState === "dismissed") {
    const why = (dismissReason ?? "other").replaceAll("-", " ");
    return `This posting was dismissed (${why}): ${job}.`;
  }
  return reviewState === "pending"
    ? `This posting is already proposed: ${job}.`
    : `This posting is already a job: ${job}.`;
}

// The owner's company, which a job must name.
export async function requireCompany(
  companiesRepository: ICompaniesRepository,
  ownerId: string,
  companyId: string,
  tx: ITransaction,
): Promise<void> {
  if (!(await companiesRepository.get(ownerId, companyId, tx))) {
    throw new NotFoundError("Couldn't find that company.");
  }
}
