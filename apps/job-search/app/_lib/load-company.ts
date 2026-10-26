import { notFound } from "next/navigation";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import type { CompanyDetail } from "@/src/entities/models/company.model";

// A company for its pages: an unknown or malformed id is a 404, and anything else is logged by
// class and code (docs/build-plan.md KTD20) and rethrown to app/error.tsx. Each page reads the
// session once and passes it on.
export async function loadCompany(
  id: string,
  actor: CurrentActor,
): Promise<CompanyDetail> {
  try {
    return await getInjection("IGetCompanyController")({ id }, actor);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    getInjection("ILoggerService")
      .child({ layer: "page", op: "loadCompany" })
      .error("Couldn't load the company", { companyId: id, ...loggable(err) });
    throw err;
  }
}
