import { notFound } from "next/navigation";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import type { Block } from "@/src/entities/models/block.model";

// A Focus block for its pages: an unknown or malformed id is a 404, and anything else is logged
// by class and code (docs/build-plan.md KTD20) and rethrown to app/error.tsx.
export async function loadBlock(
  id: string,
  actor: CurrentActor,
): Promise<Block> {
  try {
    return await getInjection("IGetBlockController")({ id }, actor);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    getInjection("ILoggerService")
      .child({ layer: "page", op: "loadBlock" })
      .error("Couldn't load the block", { blockId: id, ...loggable(err) });
    throw err;
  }
}
