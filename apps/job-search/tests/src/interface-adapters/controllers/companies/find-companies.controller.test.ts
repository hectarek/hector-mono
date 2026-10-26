import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { findCompaniesController } from "@/src/interface-adapters/controllers/companies/find-companies.controller";
import { OWNER } from "@/tests/_support/app";

const CLAUDE: CurrentActor = { actor: "agent", ownerId: OWNER };

const setup = () => {
  const useCase = mock(async () => ({ companies: [], nextOffset: null }));
  return {
    useCase,
    controller: findCompaniesController(useCase, new MockLoggerService()),
  };
};

describe("findCompaniesController", () => {
  it("hands the use case the owner's id and the query as read, the first page by default", async () => {
    const { useCase, controller } = setup();
    await controller({ query: " acme " }, CLAUDE);
    expect(useCase).toHaveBeenCalledWith(OWNER, {
      query: "acme",
      limit: 20,
      offset: 0,
    });
  });

  it("rejects a page larger than 50 before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(controller({ limit: 51 }, CLAUDE)).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });
});
