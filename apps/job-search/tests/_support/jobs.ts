// Jobs as the use-case tests make them: fictional companies and postings, through the use cases,
// so both backends hold the same rows.
import { spyOn } from "bun:test";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { saveCompanySchema } from "@/src/entities/models/company.model";
import { addJobSchema, type Job } from "@/src/entities/models/job.model";
import { OWNER, type TestApp } from "@/tests/_support/app";

export const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "add_job",
};
export const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };

// A posting no other test uses.
export const newPosting = () =>
  `https://boards.greenhouse.io/acme/jobs/${crypto.randomUUID().slice(0, 8)}`;

export function jobFixtures(app: TestApp) {
  return {
    // A company for jobs to name.
    async company(name = "Acme Inc", ownerId = OWNER): Promise<string> {
      const saved = await app.saveCompany(
        { actor: "owner", ownerId },
        saveCompanySchema.parse({ name }),
      );
      return saved.company.id;
    },

    // A job Claude adds: a new posting, with its reason.
    byClaude(
      companyId: string,
      input: Record<string, unknown> = {},
      context: ChangeContext = CLAUDE,
    ): Promise<Job> {
      return app.createJob(
        context,
        addJobSchema.parse({
          companyId,
          role: "Widget engineer",
          postingUrl: newPosting(),
          source: "Widget Jobs",
          reason: "Matches the target role",
          ...input,
        }),
      );
    },

    // A job Hector adds.
    add(
      companyId: string,
      input: Record<string, unknown> = {},
      context: ChangeContext = HECTOR,
    ): Promise<Job> {
      return app.createJob(
        context,
        addJobSchema.parse({
          companyId,
          role: "Widget engineer",
          source: "Referral",
          ...input,
        }),
      );
    },
  };
}

// The posting lock and the read it guards, by name, in the order a write makes them (KTD8). The
// tests' backends run one transaction at a time, so only the order shows the lock comes first.
export function watchPostingReads(app: TestApp): string[] {
  const calls: string[] = [];
  const jobs = app.repos.jobs;
  const { lockPostings, findByPostingKey } = jobs;
  spyOn(jobs, "lockPostings").mockImplementation((ownerId, tx) => {
    calls.push("lockPostings");
    return lockPostings.call(jobs, ownerId, tx);
  });
  spyOn(jobs, "findByPostingKey").mockImplementation((ownerId, key, tx) => {
    calls.push("findByPostingKey");
    return findByPostingKey.call(jobs, ownerId, key, tx);
  });
  return calls;
}
