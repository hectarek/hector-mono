import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IPreviewInviteUseCase } from "@/src/application/use-cases/spaces/preview-invite.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { InvitePreview } from "@/src/entities/models/space.model";

const inputSchema = z.object({
  token: z.string().min(8).max(100),
});

export type IPreviewInviteController = ReturnType<
  typeof previewInviteController
>;

export const previewInviteController = (
  useCase: IPreviewInviteUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "previewInvite",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<InvitePreview> => {
    // No sign-in check: the welcome screen previews an invite for someone without an
    // account yet. The preview is only the space's name, type and the link's role.
    logger.debug("Validating input", { hasUserId: !!userId });

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.token, userId);
  };
};
