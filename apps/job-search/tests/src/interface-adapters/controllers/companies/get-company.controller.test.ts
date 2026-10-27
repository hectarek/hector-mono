import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import type { CompanyDetail } from "@/src/entities/models/company.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { getCompanyController } from "@/src/interface-adapters/controllers/companies/get-company.controller";
import { OWNER } from "@/tests/_support/app";

const CLAUDE: CurrentActor = { actor: "agent", ownerId: OWNER };
const ID = "00000000-0000-4000-8000-0000000000c1";

const setup = () => {
  const useCase = mock(async (): Promise<CompanyDetail> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: getCompanyController(useCase, new MockLoggerService()),
  };
};

describe("getCompanyController", () => {
  it("hands the use case the owner's id and the company's", async () => {
    const { useCase, controller } = setup();
    await controller({ id: ID }, CLAUDE).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(OWNER, { id: ID });
  });

  it("rejects a malformed id before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(controller({ id: "x" }, CLAUDE)).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });
});
