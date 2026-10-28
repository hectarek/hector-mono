import { notFound } from "next/navigation";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import type { PracticeSession } from "@/src/entities/models/practice-entry.model";

// A practice session for its page: an unknown or malformed id is a 404, and anything else is
// logged by class and code (docs/build-plan.md KTD20) and rethrown to app/error.tsx.
export async function loadPracticeSession(
  id: string,
  actor: CurrentActor,
): Promise<PracticeSession> {
  try {
    return await getInjection("IGetPracticeSessionController")({ id }, actor);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    getInjection("ILoggerService")
      .child({ layer: "page", op: "loadPracticeSession" })
      .error("Couldn't load the practice session", {
        sessionId: id,
        ...loggable(err),
      });
    throw err;
  }
}
