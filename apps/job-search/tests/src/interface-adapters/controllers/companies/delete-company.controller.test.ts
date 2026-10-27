import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { deleteCompanyController } from "@/src/interface-adapters/controllers/companies/delete-company.controller";
import { OWNER } from "@/tests/_support/app";

const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };
const ID = "00000000-0000-4000-8000-0000000000c1";

const setup = () => {
  const useCase = mock(async () => ({ id: ID, name: "Acme Inc" }));
  return {
    useCase,
    controller: deleteCompanyController(useCase, new MockLoggerService()),
  };
};

describe("deleteCompanyController", () => {
  it("hands the use case who's deleting and which company", async () => {
    const { useCase, controller } = setup();
    await controller({ id: ID }, HECTOR);
    expect(useCase).toHaveBeenCalledWith(HECTOR, { id: ID });
  });

  it("rejects a malformed id before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(controller({ id: "x" }, HECTOR)).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });
});
