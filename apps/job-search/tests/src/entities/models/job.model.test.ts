import { describe, expect, it } from "bun:test";
import {
  addJobSchema,
  closeJobSchema,
  findJobsSchema,
  pinJobSchema,
  setJobStatusSchema,
  updateJobSchema,
} from "@/src/entities/models/job.model";

const ID = "00000000-0000-4000-8000-0000000000c1";
const CLAUDES_JOB = {
  companyId: ID,
  role: "Widget engineer",
  postingUrl: "https://boards.greenhouse.io/acme/jobs/4001",
  source: "Widget Jobs",
  reason: "Matches the target role",
};

const messageOf = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("a job's inputs", () => {
  // The use case checks Claude's link and reason, since only who's acting tells them apart (KTD3).
  it("take Claude's job with its link, reason, score and posting date, and Hector's with its source alone", () => {
    expect(
      addJobSchema.parse({ ...CLAUDES_JOB, score: 8, postedOn: "2026-10-20" }),
    ).toMatchObject({ score: 8, postedOn: "2026-10-20" });
    expect(
      addJobSchema.safeParse({
        companyId: ID,
        role: "Widget engineer",
        source: "Referral",
      }).success,
    ).toBe(true);
    expect(
      addJobSchema.safeParse({ ...CLAUDES_JOB, source: undefined }).success,
    ).toBe(false);
  });

  it("take a fit score from 1 to 10, as a whole number", () => {
    for (const score of [0, 11, 7.5]) {
      expect(addJobSchema.safeParse({ ...CLAUDES_JOB, score }).success).toBe(
        false,
      );
    }
    expect(addJobSchema.safeParse({ ...CLAUDES_JOB, score: 10 }).success).toBe(
      true,
    );
  });

  it("refuse a link that isn't http or https, and a band whose top is below its bottom", () => {
    expect(
      messageOf(
        addJobSchema.safeParse({
          ...CLAUDES_JOB,
          postingUrl: "javascript:alert(1)",
        }),
      ),
    ).toBe("Use an http or https link, like https://example.com");
    expect(
      messageOf(
        addJobSchema.safeParse({
          ...CLAUDES_JOB,
          payMin: 67_890,
          payMax: 12_345,
        }),
      ),
    ).toBe("The top of the band is below its bottom");
  });

  it("point a closed status in set_job_status to close_job, and want a closing's reason", () => {
    expect(
      messageOf(setJobStatusSchema.safeParse({ id: ID, status: "rejected" })),
    ).toContain("The statuses that archive a job go through close_job");
    expect(
      setJobStatusSchema.safeParse({ id: ID, status: "applied" }).success,
    ).toBe(true);
    expect(
      messageOf(closeJobSchema.safeParse({ id: ID, status: "rejected" })),
    ).toBe("Invalid input: expected string, received undefined");
    expect(
      closeJobSchema.safeParse({ id: ID, status: "rejected", reason: "  " })
        .success,
    ).toBe(false);
  });

  it("take a change only with the updatedAt read, find every job unless told otherwise, and pin only with a yes or a no", () => {
    expect(
      updateJobSchema.safeParse({ id: ID, role: "Engineer" }).success,
    ).toBe(false);
    expect(findJobsSchema.parse({})).toEqual({ limit: 20, offset: 0 });
    expect(findJobsSchema.parse({ status: "to-apply" }).status).toBe(
      "to-apply",
    );
    expect(messageOf(pinJobSchema.safeParse({ id: ID, pinned: "yes" }))).toBe(
      "Say true to pin, or false to unpin",
    );
  });
});
