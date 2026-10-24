import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IWhoamiUseCase } from "@/src/application/use-cases/session/whoami.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  type WhoAmI,
  whoamiSchema,
} from "@/src/entities/models/agent-session.model";

export type IWhoamiController = ReturnType<typeof whoamiController>;

// whoami's read (docs/build-plan.md KTD4). Who is acting is already settled: the action asked the
// session first.
export const whoamiController = (
  useCase: IWhoamiUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "whoami" });

  return async (input: unknown, actor: CurrentActor): Promise<WhoAmI> => {
    const { error: parseError } = whoamiSchema.safeParse(input);
    if (parseError) {
      logger.warn("whoami input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(actor);
  };
};
