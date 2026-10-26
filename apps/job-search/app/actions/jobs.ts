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
import type { Job, JobDetail, JobPage } from "@/src/entities/models/job.model";

// Jobs and the review queue (docs/build-plan.md U6): plain-argument actions that answer an envelope
// and never redirect (KTD4). find_jobs, get_job, propose_job, update_job, set_job_status and
// close_job call theirs once U4's gate passes; adding from the form is Hector's way in, and
// reviewing proposals and deleting are his alone (R21).

export async function findJobs(input: unknown): Promise<ActionResult<JobPage>> {
  try {
    return succeeded(
      await getInjection("IFindJobsController")(input, await getActionActor()),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("findJobs"),
      "Couldn't list the jobs. Try again.",
    );
  }
}

export async function getJob(input: unknown): Promise<ActionResult<JobDetail>> {
  try {
    return succeeded(
      await getInjection("IGetJobController")(input, await getActionActor()),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("getJob"),
      "Couldn't read the job. Try again.",
    );
  }
}

// Claude's find, to wait for Hector's review. `tool` is the page tool's name.
export async function proposeJob(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Job>> {
  return write("proposeJob", "Couldn't propose the job. Try again.", async () =>
    getInjection("IProposeJobController")(input, await changeContext(tool)),
  );
}

// A job Hector adds from the form.
export async function addJob(input: unknown): Promise<ActionResult<Job>> {
  return write("addJob", "Couldn't add the job. Try again.", async () =>
    getInjection("IAddJobController")(input, await changeContext()),
  );
}

export async function updateJob(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Job>> {
  return write("updateJob", "Couldn't save the job. Try again.", async () =>
    getInjection("IUpdateJobController")(input, await changeContext(tool)),
  );
}

export async function setJobStatus(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Job>> {
  return write("setJobStatus", "Couldn't move the job. Try again.", async () =>
    getInjection("ISetJobStatusController")(input, await changeContext(tool)),
  );
}

export async function closeJob(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Job>> {
  return write("closeJob", "Couldn't close the job. Try again.", async () =>
    getInjection("ICloseJobController")(input, await changeContext(tool)),
  );
}

export async function acceptProposal(
  input: unknown,
): Promise<ActionResult<Job>> {
  return write(
    "acceptProposal",
    "Couldn't accept the job. Try again.",
    async () =>
      getInjection("IAcceptProposalController")(input, await changeContext()),
  );
}

export async function dismissProposal(
  input: unknown,
): Promise<ActionResult<Job>> {
  return write(
    "dismissProposal",
    "Couldn't dismiss the job. Try again.",
    async () =>
      getInjection("IDismissProposalController")(input, await changeContext()),
  );
}

export async function reopenProposal(
  input: unknown,
): Promise<ActionResult<Job>> {
  return write(
    "reopenProposal",
    "Couldn't reopen the job. Try again.",
    async () =>
      getInjection("IReopenProposalController")(input, await changeContext()),
  );
}

export async function deleteJob(
  input: unknown,
): Promise<ActionResult<{ id: string; role: string }>> {
  let deleted: { id: string; role: string };
  try {
    deleted = await getInjection("IDeleteJobController")(
      input,
      await changeContext(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("deleteJob"),
      "Couldn't delete the job. Try again.",
    );
  }
  revalidatePath("/jobs");
  revalidatePath("/jobs/dismissed");
  revalidatePath(`/jobs/${deleted.id}`);
  revalidatePath("/agent");
  return succeeded(deleted);
}

// A write to one job: run, answer the envelope, and refresh the pages that show the job.
async function write(
  op: string,
  fallback: string,
  run: () => Promise<Job>,
): Promise<ActionResult<Job>> {
  let job: Job;
  try {
    job = await run();
  } catch (err) {
    return toActionError(err, actionLogger(op), fallback);
  }
  revalidatePath("/jobs");
  revalidatePath("/jobs/dismissed");
  revalidatePath(`/jobs/${job.id}`);
  revalidatePath(`/companies/${job.company.id}`);
  revalidatePath("/agent");
  return succeeded(job);
}
