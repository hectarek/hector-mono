import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  TOOL_SET_VERSION,
  type WhoAmI,
} from "@/src/entities/models/agent-session.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IWhoamiUseCase = typeof whoamiUseCase;

// Who the session acts as, today's date in Eastern time, from the server's clock (KTD18), and the
// tool set's version: what Claude checks at the start of a session (docs/build-plan.md U4).
export function whoamiUseCase({ actor }: CurrentActor): WhoAmI {
  return {
    actor,
    today: todayIn(PLAN_TIME_ZONE),
    toolSetVersion: TOOL_SET_VERSION,
  };
}
