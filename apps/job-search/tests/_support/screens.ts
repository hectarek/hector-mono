// Records the screen tests make through the app's own actions, signed in as Hector unless said:
// fictional companies and jobs, each named for the test that makes it.
import { saveCompany } from "@/app/actions/companies";
import { addJob, proposeJob } from "@/app/actions/jobs";
import type { ActionResult } from "@/app/actions/shared";
import type { Job } from "@/src/entities/models/job.model";
import { newPosting } from "@/tests/_support/jobs";
import { signInAs } from "@/tests/_support/session";

export function dataOf<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(
      `Expected a success, got ${result.code}: ${result.message}`,
    );
  }
  return result.data;
}

export async function aCompany(name = "Acme"): Promise<string> {
  signInAs("owner");
  const saved = dataOf(
    await saveCompany({ name: `${name} ${crypto.randomUUID().slice(0, 8)}` }),
  );
  return saved.company.id;
}

// A job Hector adds.
export async function aJob(
  companyId: string,
  input: Record<string, unknown> = {},
): Promise<Job> {
  signInAs("owner");
  return dataOf(
    await addJob({
      companyId,
      role: "Widget engineer",
      source: "Referral",
      ...input,
    }),
  );
}

// Claude's proposal.
export async function aProposal(
  companyId: string,
  input: Record<string, unknown> = {},
): Promise<Job> {
  signInAs("agent");
  return dataOf(
    await proposeJob({
      companyId,
      role: "Gadget designer",
      postingUrl: newPosting(),
      source: "Widget Jobs",
      reason: "Matches the target role",
      ...input,
    }),
  );
}
