import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import { DuplicateError, NotFoundError } from "@/src/entities/errors/common";
import { isClosed } from "@/src/entities/job-lifecycle";
import type { DuplicateJob } from "@/src/entities/models/job.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Checks a job's write makes inside its transaction (docs/build-plan.md U6).

// Refuses a posting already on another job, archived ones included, so a job Hector passed on
// stays passed on (R20, KTD8), naming that job and saying when it's archived. Take the posting lock
// first, so a write started meanwhile waits.
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

function duplicateMessage({ role, company, status }: DuplicateJob): string {
  const job = `${role} at ${company}`;
  return isClosed(status)
    ? `This posting is on an archived job: ${job}.`
    : `This posting is already a job: ${job}.`;
}

// The owner's company, which a job must name. It stays locked to the write, so a delete of the
// company waits and then counts this job, or comes first and leaves the job no company to name.
export async function requireCompany(
  companiesRepository: ICompaniesRepository,
  ownerId: string,
  companyId: string,
  tx: ITransaction,
): Promise<void> {
  if (!(await companiesRepository.getForUpdate(ownerId, companyId, tx))) {
    throw new NotFoundError("Couldn't find that company.");
  }
}
