// Where Claude reaches each of the app's server entry points (docs/build-plan.md KTD5, KTD16;
// R18, R21): the page tool that calls it, or why it's Hector's alone. The parity test
// (tests/app/_lib/agent-tools/parity.test.ts) fails on an action, route handler or page read
// missing here, on an entry whose export is gone, and on a human-only action that has a tool.
//
// - `{ tool }`: the tool whose action this is.
// - `{ tool, via }`: reached through another tool's action, and why.
// - `{ humanOnly }`: no tool calls it, and why.
// - `{ agentEndpoint }`: it serves the tools themselves, and how (KTD22).
export type Reach =
  | { tool: string; via?: string }
  | { humanOnly: string }
  | { agentEndpoint: string };

const DELETING = "Deleting anything is Hector's (R21).";
const REVIEWING =
  "Accepting, dismissing and reopening a proposal is Hector's review (R20, R21).";

// The exported actions in app/actions/, as "<file>.<export>".
export const ACTION_REACH: Record<string, Reach> = {
  "activity.listActivity": { tool: "list_activity" },
  "blocks.addBlocks": { tool: "add_blocks" },
  "blocks.updateBlock": { tool: "update_block" },
  "blocks.listBlocks": { tool: "list_blocks" },
  "blocks.getBlock": { tool: "get_block" },
  "blocks.deleteBlock": { humanOnly: DELETING },
  "companies.findCompanies": { tool: "find_companies" },
  "companies.getCompany": { tool: "get_company" },
  "companies.saveCompany": { tool: "save_company" },
  "companies.deleteCompany": { humanOnly: DELETING },
  "interactions.logInteraction": { tool: "log_interaction" },
  "interactions.deleteInteraction": { humanOnly: DELETING },
  "jobs.findJobs": { tool: "find_jobs" },
  "jobs.getJob": { tool: "get_job" },
  "jobs.proposeJob": { tool: "propose_job" },
  "jobs.addJob": {
    tool: "propose_job",
    via: "Hector's form adds a job, accepted at once; Claude's finds wait in his review queue as proposals (KTD3, R20).",
  },
  "jobs.updateJob": { tool: "update_job" },
  "jobs.setJobStatus": { tool: "set_job_status" },
  "jobs.closeJob": { tool: "close_job" },
  "jobs.acceptProposal": { humanOnly: REVIEWING },
  "jobs.dismissProposal": { humanOnly: REVIEWING },
  "jobs.reopenProposal": { humanOnly: REVIEWING },
  "jobs.deleteJob": { humanOnly: DELETING },
  "notes.addNote": { tool: "add_note" },
  "notes.editNote": {
    humanOnly: "Claude's notes only append; editing one is Hector's (R21).",
  },
  "notes.deleteNote": { humanOnly: DELETING },
  "people.findPeople": { tool: "find_people" },
  "people.getPerson": { tool: "get_person" },
  "people.addPerson": { tool: "add_person" },
  "people.updatePerson": { tool: "update_person" },
  "people.deletePerson": { humanOnly: DELETING },
  "people.removeContact": {
    humanOnly: "Taking a contact off a job is Hector's, as deleting is (R21).",
  },
  "practice.listPractice": { tool: "list_practice" },
  "practice.getPracticeSession": { tool: "get_practice_session" },
  "practice.logPractice": { tool: "log_practice" },
  "practice.deletePracticeEntry": { humanOnly: DELETING },
  "session.whoami": { tool: "whoami" },
  "session.startSession": { tool: "start_session" },
  "settings.getSettings": { tool: "get_settings" },
  "settings.updateSettings": {
    humanOnly:
      "Changing the targets and the queue's cap is Hector's (R12, R21).",
  },
  "sources.listSources": { tool: "list_sources" },
  "sources.addSource": { tool: "add_source" },
  "week.getToday": { tool: "get_today" },
  "week.getWeek": { tool: "get_week" },
  "week.saveWeeklyReview": { tool: "save_weekly_review" },
  "week.listProposals": { tool: "list_proposals" },
};

// The route handlers under app/(api)/, as "<path> <method>".
const AUTH =
  "Neon Auth's endpoints: Hector signs Claude in, and Claude's session can only read itself, which whoami does, sign out, and take the OAuth steps that authorize the MCP endpoint (R21, R23).";
const MCP =
  "The MCP endpoint: the registry's tools, served to Claude's account alone on a token Neon issued it, each running its page tool's action (KTD22, U18).";
export const ROUTE_REACH: Record<string, Reach> = {
  "api/auth/[...path] GET": { humanOnly: AUTH },
  "api/auth/[...path] POST": { humanOnly: AUTH },
  "mcp POST": { agentEndpoint: MCP },
};

// The reads pages and their loaders make through a controller, without an action, and the tool
// that gives Claude the same read.
export const PAGE_READS: Record<string, string> = {
  IFindCompaniesController: "find_companies",
  IGetBlockController: "get_block",
  IFindJobsController: "find_jobs",
  IFindPeopleController: "find_people",
  IGetCompanyController: "get_company",
  IGetJobController: "get_job",
  IGetPersonController: "get_person",
  IGetPracticeSessionController: "get_practice_session",
  IGetSettingsController: "get_settings",
  IGetTodayController: "get_today",
  IGetWeekController: "get_week",
  IListActivityController: "list_activity",
  IListBlocksController: "list_blocks",
  IListPracticeController: "list_practice",
  IListSourcesController: "list_sources",
};
