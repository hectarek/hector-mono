import { z } from "zod";
import type { AllowedUserIds } from "@/src/application/use-cases/access/resolve-actor";
import { NotAllowedError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";

const allowedUserIdsSchema = z.object({
  ownerUserId: z.uuid(),
  agentUserId: z.uuid(),
});

export type IResolveTokenActor = ReturnType<typeof resolveTokenActor>;

// Who an MCP endpoint's verified token acts as (docs/build-plan.md KTD22, R21 as revised): the
// token's subject must be Claude's account, which acts on Hector's rows. Any other account's
// token, Hector's included, is refused with NotAllowedError, so the endpoint never acts as him.
// With an id missing or malformed, every token is refused, as every session is (resolve-actor.ts).
export const resolveTokenActor = (allowedUserIds: AllowedUserIds) => {
  const allowed = allowedUserIdsSchema.safeParse(allowedUserIds);

  return (userId: string): CurrentActor => {
    if (!allowed.success || userId !== allowed.data.agentUserId) {
      throw new NotAllowedError();
    }
    return { actor: "agent", ownerId: allowed.data.ownerUserId };
  };
};
