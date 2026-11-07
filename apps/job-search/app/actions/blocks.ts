"use server";

import { getActionActor } from "@/app/_lib/current-actor";
import { type ActionResult, answer, changeContext } from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type {
  Block,
  BlocksWeek,
  DeletedBlock,
} from "@/src/entities/models/block.model";

// Focus blocks (docs/build-plan.md U17, R26): add_blocks, update_block, list_blocks and get_block
// call the first four; deleting a block is Hector's alone (R21).

// One block from Hector's form, or a week's from Claude. `tool` is the page tool's name.
export async function addBlocks(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Block[]>> {
  return answer(
    "addBlocks",
    "Couldn't add the blocks. Try again.",
    async () =>
      getInjection("IAddBlocksController")(input, await changeContext(tool)),
    (blocks) => blocks.flatMap(pagesOf),
  );
}

export async function updateBlock(
  input: unknown,
  tool?: string,
): Promise<ActionResult<Block>> {
  return answer(
    "updateBlock",
    "Couldn't save the block. Try again.",
    async () =>
      getInjection("IUpdateBlockController")(input, await changeContext(tool)),
    pagesOf,
  );
}

export async function listBlocks(
  input: unknown,
): Promise<ActionResult<BlocksWeek>> {
  return answer(
    "listBlocks",
    "Couldn't list the blocks. Try again.",
    async () =>
      getInjection("IListBlocksController")(input, await getActionActor()),
  );
}

export async function getBlock(input: unknown): Promise<ActionResult<Block>> {
  return answer("getBlock", "Couldn't read that block. Try again.", async () =>
    getInjection("IGetBlockController")(input, await getActionActor()),
  );
}

export async function deleteBlock(
  input: unknown,
): Promise<ActionResult<DeletedBlock>> {
  return answer(
    "deleteBlock",
    "Couldn't delete the block. Try again.",
    async () =>
      getInjection("IDeleteBlockController")(input, await changeContext()),
    pagesOf,
  );
}

// The pages a block shows on: This week, the week page, its own page, and Claude's page, which
// lists its changes.
function pagesOf({ id }: { id: string }): string[] {
  return ["/", "/week", `/blocks/${id}`, "/agent"];
}
