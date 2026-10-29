"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type {
  DeletedJob,
  Job,
  JobDetail,
  JobPage,
} from "@/src/entities/models/job.model";

// Jobs and the review queue (docs/build-plan.md U6): plain-argument actions that answer an envelope
// and never redirect (KTD4). find_jobs, get_job, propose_job, update_job, set_job_status and
// close_job call theirs once U4's gate passes; adding from the form is Hector's way in, and
// reviewing proposals and deleting are his alone (R21).

export async function findJobs(input: unknown): Promise<ActionResult<JobPage>> {
  return answer("findJobs", "Couldn't list the jobs. Try again.", async () =>
    getInjection("IFindJobsController")(input, await getActionActor()),
  );
}

export async function getJob(input: unknown): Promise<ActionResult<JobDetail>> {
  return answer("getJob", "Couldn't read the job. Try again.", async () =>
    getInjection("IGetJobController")(input, await getActionActor()),
  );
}

// Claude's find, to wait for Hector's review. `tool` is the page tool's name.
export async function proposeJob(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Job>> {
  return answer(
    "proposeJob",
    "Couldn't propose the job. Try again.",
    async () =>
      getInjection("IProposeJobController")(input, await changeContext(tool)),
    pagesOf,
  );
}

// A job Hector adds from the form.
export async function addJob(input: unknown): Promise<ActionResult<Job>> {
  return answer(
    "addJob",
    "Couldn't add the job. Try again.",
    async () => getInjection("IAddJobController")(input, await changeContext()),
    pagesOf,
  );
}

export async function updateJob(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Job>> {
  return answer(
    "updateJob",
    "Couldn't save the job. Try again.",
    async () =>
      getInjection("IUpdateJobController")(input, await changeContext(tool)),
    pagesOf,
  );
}

export async function setJobStatus(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Job>> {
  return answer(
    "setJobStatus",
    "Couldn't move the job. Try again.",
    async () =>
      getInjection("ISetJobStatusController")(input, await changeContext(tool)),
    pagesOf,
  );
}

export async function closeJob(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Job>> {
  return answer(
    "closeJob",
    "Couldn't close the job. Try again.",
    async () =>
      getInjection("ICloseJobController")(input, await changeContext(tool)),
    pagesOf,
  );
}

export async function acceptProposal(
  input: unknown,
): Promise<ActionResult<Job>> {
  return answer(
    "acceptProposal",
    "Couldn't accept the job. Try again.",
    async () =>
      getInjection("IAcceptProposalController")(input, await changeContext()),
    pagesOf,
  );
}

export async function dismissProposal(
  input: unknown,
): Promise<ActionResult<Job>> {
  return answer(
    "dismissProposal",
    "Couldn't dismiss the job. Try again.",
    async () =>
      getInjection("IDismissProposalController")(input, await changeContext()),
    pagesOf,
  );
}

export async function reopenProposal(
  input: unknown,
): Promise<ActionResult<Job>> {
  return answer(
    "reopenProposal",
    "Couldn't reopen the job. Try again.",
    async () =>
      getInjection("IReopenProposalController")(input, await changeContext()),
    pagesOf,
  );
}

export async function deleteJob(
  input: unknown,
): Promise<ActionResult<DeletedJob>> {
  return answer(
    "deleteJob",
    "Couldn't delete the job. Try again.",
    async () =>
      getInjection("IDeleteJobController")(input, await changeContext()),
    (deleted) => jobPages(deleted.id, deleted.companyId),
  );
}

// The pages that show a job: the jobs list, its own, its company's, and Claude's page, which
// lists its changes.
function jobPages(id: string, companyId: string): string[] {
  return ["/", "/jobs", `/jobs/${id}`, `/companies/${companyId}`, "/agent"];
}

function pagesOf(job: Job): string[] {
  return jobPages(job.id, job.company.id);
}
