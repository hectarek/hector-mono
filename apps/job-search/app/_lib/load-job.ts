import { notFound } from "next/navigation";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import type { JobDetail } from "@/src/entities/models/job.model";

// A job for its pages: an unknown or malformed id is a 404, and anything else is logged by class
// and code (docs/build-plan.md KTD20) and rethrown to app/error.tsx. Each page reads the session
// once and passes it on.
export async function loadJob(
  id: string,
  actor: CurrentActor,
): Promise<JobDetail> {
  try {
    return await getInjection("IGetJobController")({ id }, actor);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    getInjection("ILoggerService")
      .child({ layer: "page", op: "loadJob" })
      .error("Couldn't load the job", { jobId: id, ...loggable(err) });
    throw err;
  }
}
