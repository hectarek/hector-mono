import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { AGENT_TOOLS } from "@/app/_lib/agent-tools/registry";
import { listActivitySchema } from "@/src/entities/models/activity.model";
import {
  startSessionSchema,
  whoamiSchema,
} from "@/src/entities/models/agent-session.model";
import {
  companyIdSchema,
  findCompaniesSchema,
  saveCompanySchema,
} from "@/src/entities/models/company.model";
import { logInteractionSchema } from "@/src/entities/models/interaction.model";
import {
  closeJobSchema,
  findJobsSchema,
  jobIdSchema,
  listProposalsSchema,
  proposeJobSchema,
  setJobStatusSchema,
  updateJobSchema,
} from "@/src/entities/models/job.model";
import {
  addSourceSchema,
  listSourcesSchema,
} from "@/src/entities/models/lead-source.model";
import { addNoteSchema } from "@/src/entities/models/note.model";
import {
  addPersonSchema,
  findPeopleSchema,
  personIdSchema,
  updatePersonSchema,
} from "@/src/entities/models/person.model";
import {
  listPracticeSchema,
  logPracticeSchema,
} from "@/src/entities/models/practice-entry.model";
import { getTodaySchema } from "@/src/entities/models/today.model";
import {
  getWeekSchema,
  saveWeeklyReviewSchema,
} from "@/src/entities/models/weekly-review.model";

// The entity schema each tool's controller parses its input with. list_proposals declares
// find_jobs' filters but the review state, which its action sets itself.
const PARSED_WITH: Record<string, z.ZodType> = {
  whoami: whoamiSchema,
  start_session: startSessionSchema,
  get_today: getTodaySchema,
  get_week: getWeekSchema,
  save_weekly_review: saveWeeklyReviewSchema,
  list_proposals: listProposalsSchema,
  find_companies: findCompaniesSchema,
  get_company: companyIdSchema,
  save_company: saveCompanySchema,
  list_sources: listSourcesSchema,
  add_source: addSourceSchema,
  list_activity: listActivitySchema,
  find_jobs: findJobsSchema,
  get_job: jobIdSchema,
  propose_job: proposeJobSchema,
  update_job: updateJobSchema,
  set_job_status: setJobStatusSchema,
  close_job: closeJobSchema,
  add_note: addNoteSchema,
  find_people: findPeopleSchema,
  get_person: personIdSchema,
  add_person: addPersonSchema,
  update_person: updatePersonSchema,
  log_interaction: logInteractionSchema,
  list_practice: listPracticeSchema,
  log_practice: logPracticeSchema,
};

// The steps Claude Code asks about first (KTD5): closing a job, until U15 and the calendar add theirs.
const CONSEQUENTIAL = ["close_job"];

describe("Claude's page tools", () => {
  it("each take, as their input schema, the JSON Schema of the entity schema their controller parses with", () => {
    expect(AGENT_TOOLS.map(({ name }) => name).sort()).toEqual(
      Object.keys(PARSED_WITH).sort(),
    );
    for (const { name, inputSchema } of AGENT_TOOLS) {
      const schema = PARSED_WITH[name];
      if (!schema) throw new Error(`No entity schema listed for ${name}`);
      expect(inputSchema).toEqual(z.toJSONSchema(schema, { io: "input" }));
    }
  });

  it("have snake_case names of at most 30 characters and descriptions under 500", () => {
    for (const { name, description } of AGENT_TOOLS) {
      expect(name).toMatch(/^[a-z][a-z_]{0,29}$/);
      expect(description.length).toBeLessThan(500);
    }
  });

  it("mark only the steps Claude Code asks about first as consequential, and no read", () => {
    expect(
      AGENT_TOOLS.filter(({ annotations }) => annotations?.consequentialHint)
        .map(({ name }) => name)
        .sort(),
    ).toEqual(CONSEQUENTIAL);
    for (const { annotations } of AGENT_TOOLS) {
      expect(
        Boolean(annotations?.readOnlyHint && annotations.consequentialHint),
      ).toBe(false);
    }
  });
});
