// Jobs as the use-case tests make them: fictional companies and postings, through the use cases,
// so both backends hold the same rows.
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { saveCompanySchema } from "@/src/entities/models/company.model";
import {
  addJobSchema,
  type Job,
  proposeJobSchema,
} from "@/src/entities/models/job.model";
import { OWNER, type TestApp } from "@/tests/_support/app";

export const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "propose_job",
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

    // Claude's proposal of a new posting.
    propose(
      companyId: string,
      input: Record<string, unknown> = {},
      context: ChangeContext = CLAUDE,
    ): Promise<Job> {
      return app.createJob(
        context,
        proposeJobSchema.parse({
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
