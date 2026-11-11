import { z } from "zod";
import type { ClaudeSession } from "../claude-sessions";
import type { WeeklyCounts } from "../weekly-counts";
import type { Block, BlocksDone } from "./block.model";
import type { Interaction } from "./interaction.model";
import type { JobSummary } from "./job.model";
import type { PersonRef, PersonSummary } from "./person.model";
import type { DueSession } from "./practice-entry.model";
import type { Settings } from "./settings.model";

// A job that's due, with its contacts, so its follow-up can be logged to one of them (the UX
// plan's UX3).
export type DueJob = JobSummary & { contacts: PersonRef[] };

// A scheduled conversation whose end has passed, with the person it was with, for Hector to say
// how it went (R8, R9).
export type ConversationToDebrief = {
  conversation: Interaction;
  person: PersonRef;
};

// What Today shows and get_today answers (R9 as revised 2026-11-10); the calendar comes with U13
// and U14, and interview rounds' debriefs with U12. Apply next: the top three of the ranked list
// (R27). Decisions: conversations to debrief. Due: jobs and people whose next date is today or
// earlier (a stale candidate shows once, as one), stale candidates, and practice reviews due.
// Claude's sessions of the last 7 days. The week's counts so far, beside Hector's targets.
export type TodayView = {
  today: string;
  monday: string;
  applyNext: JobSummary[];
  decisions: {
    debriefs: ConversationToDebrief[];
  };
  due: {
    jobs: DueJob[];
    people: PersonSummary[];
    stale: JobSummary[];
    practice: DueSession[];
  };
  // Jobs and people due after today, through Sunday (R9 as revised 2026-11-07, the UX plan's UX4).
  later: {
    jobs: DueJob[];
    people: PersonSummary[];
  };
  // How many open jobs and people have a next step with no date, which Today never shows as due
  // (R9 as revised 2026-11-07, the UX plan's UX6).
  undated: { jobs: number; people: number };
  // Today's Focus blocks, by start, each with how it went (R9 and R26 as added 2026-11-07, U17).
  blocks: Block[];
  // The week's Focus blocks done against those planned, for the week's line (R9 as revised
  // 2026-11-10).
  weekBlocks: BlocksDone;
  claude: ClaudeSession[];
  counts: WeeklyCounts;
  targets: Settings["targets"];
  // The search season Today tracks toward, from Settings, null until Hector sets it (R9 and R12
  // as revised 2026-11-10).
  season: Settings["season"];
};

// get_today's input: there's nothing to give.
export const getTodaySchema = z.object({});
