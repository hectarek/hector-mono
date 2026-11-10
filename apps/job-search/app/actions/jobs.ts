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

// Jobs and the ranked list (docs/build-plan.md U6, U19): plain-argument actions that answer an
// envelope and never redirect (KTD4). Each but deleting, which is Hector's alone (R21), is a tool
// too: find_jobs, get_job, add_job, update_job, pin_job, set_job_status and close_job.

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

// A job for the ranked list: Hector's from the form, or Claude's find (R20 as revised
// 2026-11-10). `tool` is the tool's name.
export async function addJob(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Job>> {
  return answer(
    "addJob",
    "Couldn't add the job. Try again.",
    async () =>
      getInjection("IAddJobController")(input, await changeContext(tool)),
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

export async function pinJob(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Job>> {
  return answer(
    "pinJob",
    "Couldn't pin the job. Try again.",
    async () =>
      getInjection("IPinJobController")(input, await changeContext(tool)),
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
