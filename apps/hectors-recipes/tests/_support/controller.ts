import { expect, it, mock } from "bun:test";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { OWNER } from "@/tests/_support/app";

// Stand-in ids for input that only needs to be a valid uuid.
export const ID = "00000000-0000-4000-8000-0000000000a1";
export const ID2 = "00000000-0000-4000-8000-0000000000a2";

type Controller = (input: unknown, userId: string | undefined) => unknown;

// What every controller does: turn away a signed-out user, reject input that fails
// validation before it reaches the use case, and hand the parsed input on.
export function controllerBasics({
  make,
  valid,
  calledWith,
  invalid,
}: {
  // `useCase` is a recording stub; `never` lets it stand in for any use case type.
  make: (useCase: never, logger: MockLoggerService) => Controller;
  valid: unknown;
  // What the use case should receive for `valid` (after trimming, defaults, etc.).
  calledWith: unknown[];
  // Label → input that must be rejected.
  invalid: Record<string, unknown>;
}): void {
  const setup = () => {
    const useCase = mock(async () => undefined);
    return {
      useCase,
      controller: make(useCase as never, new MockLoggerService()),
    };
  };

  it("turns away a signed-out user", async () => {
    const { useCase, controller } = setup();
    await expect(controller(valid, undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });

  it("passes the validated input to the use case", async () => {
    const { useCase, controller } = setup();
    await controller(valid, OWNER);
    expect(useCase).toHaveBeenCalledWith(...calledWith);
  });

  for (const [label, input] of Object.entries(invalid)) {
    it(`rejects ${label}`, async () => {
      const { useCase, controller } = setup();
      await expect(controller(input, OWNER)).rejects.toBeInstanceOf(
        InputParseError,
      );
      expect(useCase).not.toHaveBeenCalled();
    });
  }
}
