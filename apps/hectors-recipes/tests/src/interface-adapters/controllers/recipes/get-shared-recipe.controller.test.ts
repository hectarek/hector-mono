import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { getSharedRecipeController } from "@/src/interface-adapters/controllers/recipes/get-shared-recipe.controller";

// D99: the one recipe read that works signed out, so no sign-in check; the link is the access.
describe("getSharedRecipeController", () => {
  const setup = () => {
    const useCase = mock(async () => undefined);
    return {
      useCase,
      controller: getSharedRecipeController(
        useCase as never,
        new MockLoggerService(),
      ),
    };
  };
  const token = "AbC-123_xyzAbC-123_xyz12";

  it("passes a link's token on, signed in or not", async () => {
    const { useCase, controller } = setup();
    await controller({ token });
    expect(useCase).toHaveBeenCalledWith(token);
  });

  it.each([
    ["too short", "abc"],
    ["not a link's characters", "../../../etc/passwd/abcde"],
    ["not text", 42],
  ])("rejects a token %s", async (_label, bad) => {
    const { useCase, controller } = setup();
    await expect(controller({ token: bad })).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });
});
