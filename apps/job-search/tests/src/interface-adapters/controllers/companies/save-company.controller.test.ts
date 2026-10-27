import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type { SavedCompany } from "@/src/entities/models/company.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { saveCompanyController } from "@/src/interface-adapters/controllers/companies/save-company.controller";
import { OWNER } from "@/tests/_support/app";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "save_company",
};
const ID = "00000000-0000-4000-8000-0000000000c1";

const setup = () => {
  const useCase = mock(async (): Promise<SavedCompany> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: saveCompanyController(useCase, new MockLoggerService()),
  };
};

describe("saveCompanyController", () => {
  it("hands the use case who's saving and the change as read", async () => {
    const { useCase, controller } = setup();
    await controller(
      { id: ID, updatedAt: "2026-10-26T11:00:00-04:00", tier: 1 },
      CLAUDE,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(CLAUDE, {
      kind: "change",
      id: ID,
      updatedAt: new Date("2026-10-26T15:00:00Z"),
      changes: { tier: 1 },
    });
  });

  it.each([
    { label: "a new company without a name", input: { tier: 1 } },
    { label: "a change without the updatedAt read", input: { id: ID } },
    { label: "a tier of 4", input: { name: "Acme Inc", tier: 4 } },
  ])("rejects $label before the use case runs", async ({ input }) => {
    const { useCase, controller } = setup();
    await expect(controller(input, CLAUDE)).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });
});
