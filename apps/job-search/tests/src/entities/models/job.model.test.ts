import { describe, expect, it } from "bun:test";
import {
  addJobSchema,
  closeJobSchema,
  findJobsSchema,
  proposeJobSchema,
  setJobStatusSchema,
  updateJobSchema,
} from "@/src/entities/models/job.model";

const ID = "00000000-0000-4000-8000-0000000000c1";
const PROPOSAL = {
  companyId: ID,
  role: "Widget engineer",
  postingUrl: "https://boards.greenhouse.io/acme/jobs/4001",
  source: "Widget Jobs",
  reason: "Matches the target role",
};

const messageOf = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("a job's inputs", () => {
  it("take a proposal with its link, source and reason, and a job Hector adds without a link", () => {
    expect(proposeJobSchema.safeParse(PROPOSAL).success).toBe(true);
    for (const missing of ["postingUrl", "source", "reason"]) {
      const without = Object.fromEntries(
        Object.entries(PROPOSAL).filter(([key]) => key !== missing),
      );
      expect(proposeJobSchema.safeParse(without).success).toBe(false);
    }
    expect(
      addJobSchema.safeParse({
        companyId: ID,
        role: "Widget engineer",
        source: "Referral",
      }).success,
    ).toBe(true);
  });

  it("refuse a link that isn't http or https, and a band whose top is below its bottom", () => {
    expect(
      messageOf(
        proposeJobSchema.safeParse({
          ...PROPOSAL,
          postingUrl: "javascript:alert(1)",
        }),
      ),
    ).toBe("Use an http or https link, like https://example.com");
    expect(
      messageOf(
        proposeJobSchema.safeParse({
          ...PROPOSAL,
          payMin: 67_890,
          payMax: 12_345,
        }),
      ),
    ).toBe("The top of the band is below its bottom");
  });

  it("point a closed status in set_job_status to close_job, and want a closing's reason", () => {
    expect(
      messageOf(setJobStatusSchema.safeParse({ id: ID, status: "rejected" })),
    ).toContain("A closed status goes through close_job");
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

  it("take a change only with the updatedAt read, and find accepted jobs unless told otherwise", () => {
    expect(
      updateJobSchema.safeParse({ id: ID, role: "Engineer" }).success,
    ).toBe(false);
    expect(findJobsSchema.parse({})).toEqual({
      reviewState: "accepted",
      limit: 20,
      offset: 0,
    });
  });
});
