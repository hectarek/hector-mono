import { notFound } from "next/navigation";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import type { PersonDetail } from "@/src/entities/models/person.model";

// A person for their pages: an unknown or malformed id is a 404, and anything else is logged by
// class and code (docs/build-plan.md KTD20) and rethrown to app/error.tsx. Each page reads the
// session once and passes it on.
export async function loadPerson(
  id: string,
  actor: CurrentActor,
): Promise<PersonDetail> {
  try {
    return await getInjection("IGetPersonController")({ id }, actor);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    getInjection("ILoggerService")
      .child({ layer: "page", op: "loadPerson" })
      .error("Couldn't load the person", { personId: id, ...loggable(err) });
    throw err;
  }
}
