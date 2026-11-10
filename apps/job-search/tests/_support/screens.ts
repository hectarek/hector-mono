// Records the screen tests make through the app's own actions, signed in as Hector unless said:
// fictional companies and jobs, each named for the test that makes it.
import { saveCompany } from "@/app/actions/companies";
import { addJob } from "@/app/actions/jobs";
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

// A company Hector adds, with any other facts given (its tier, say).
export async function aCompany(
  name = "Acme",
  facts: Record<string, unknown> = {},
): Promise<string> {
  signInAs("owner");
  const saved = dataOf(
    await saveCompany({
      name: `${name} ${crypto.randomUUID().slice(0, 8)}`,
      ...facts,
    }),
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

// A job Claude adds.
export async function aClaudeJob(
  companyId: string,
  input: Record<string, unknown> = {},
): Promise<Job> {
  signInAs("agent");
  return dataOf(
    await addJob({
      companyId,
      role: "Gadget designer",
      postingUrl: newPosting(),
      source: "Widget Jobs",
      reason: "Matches the target role",
      ...input,
    }),
  );
}
