import { describe, expect, it, mock } from "bun:test";
import { listSourcesController } from "@/src/interface-adapters/controllers/sources/list-sources.controller";
import { OWNER } from "@/tests/_support/app";

describe("listSourcesController", () => {
  it("hands the use case the owner's id", async () => {
    const useCase = mock(async () => []);
    await listSourcesController(useCase)({ actor: "agent", ownerId: OWNER });
    expect(useCase).toHaveBeenCalledWith(OWNER);
  });
});
