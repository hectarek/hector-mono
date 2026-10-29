import { z } from "zod";
import type { ClaudeSession } from "../claude-sessions";
import type { WeeklyCounts } from "../weekly-counts";
import type { Interaction } from "./interaction.model";
import type { JobSummary } from "./job.model";
import type { PersonRef, PersonSummary } from "./person.model";
import type { DueSession } from "./practice-entry.model";
import type { Settings } from "./settings.model";

// A scheduled conversation whose end has passed, with the person it was with, for Hector to say
// how it went (R8, R9).
export type ConversationToDebrief = {
  conversation: Interaction;
  person: PersonRef;
};

// What This week shows and get_today answers (R9), in R9's order; the calendar comes with U13 and
// interview rounds' debriefs with U12. Decisions: proposals waiting for Hector and conversations
// to debrief. Due: jobs and people whose next date is today or earlier (a stale candidate shows
// once, as one), stale candidates, and practice reviews due. Claude's sessions of the last 7 days.
// The week's counts so far, beside Hector's targets.
export type TodayView = {
  today: string;
  monday: string;
  decisions: {
    proposals: JobSummary[];
    debriefs: ConversationToDebrief[];
  };
  due: {
    jobs: JobSummary[];
    people: PersonSummary[];
    stale: JobSummary[];
    practice: DueSession[];
  };
  claude: ClaudeSession[];
  counts: WeeklyCounts;
  targets: Settings["targets"];
};

// get_today's input: there's nothing to give.
export const getTodaySchema = z.object({});
