import { z } from "zod";
import { PLAN_TIME_ZONE, todayIn } from "../week";
import {
  dateSchema,
  optionalText,
  requiredText,
  timeSchema,
} from "./input.model";

// What a Focus block feeds (R26, docs/build-plan.md U17): the four efforts the search moves by,
// and upkeep, for planning and reviews.
export const EFFORTS = [
  "networking",
  "applying",
  "practice",
  "projects",
  "upkeep",
] as const;
export type Effort = (typeof EFFORTS)[number];

// How a block went (R26): planned until it's done, partly done, moved off its slot or skipped.
export const BLOCK_STATES = [
  "planned",
  "done",
  "partial",
  "moved",
  "skipped",
] as const;
export type BlockState = (typeof BLOCK_STATES)[number];

// What a block holds that a change can set: when it runs, the effort it feeds, what it is, the
// outcome that makes it done, how it went and what happened.
export type BlockFacts = {
  startsAt: Date;
  endsAt: Date;
  effort: Effort;
  title: string;
  doneWhen: string | null;
  state: BlockState;
  whatHappened: string | null;
};

// A block as stored: its facts and the day it's on, its start's in Eastern time (KTD18).
export type Block = BlockFacts & {
  id: string;
  day: string;
  // When it last changed: a change sends back the one it read (R22).
  updatedAt: Date;
};

// The day a block is on: its start's, in Eastern time (KTD18), whatever the server's zone.
export function blockDay(startsAt: Date): string {
  return todayIn(PLAN_TIME_ZONE, startsAt);
}

// A block as its history records it: its facts, since its day follows its start.
export function blockLogged({
  id,
  day,
  updatedAt,
  ...facts
}: Block): Record<string, unknown> {
  return facts;
}

const effortSchema = z.enum(EFFORTS, {
  error: `Use one of: ${EFFORTS.join(", ")}`,
});
const stateSchema = z.enum(BLOCK_STATES, {
  error: `Use one of: ${BLOCK_STATES.join(", ")}`,
});
const titleSchema = requiredText(120, "Name the block");
const doneWhenSchema = optionalText(300);
const whatHappenedSchema = optionalText(1000);

// Whether a block's times hold: it ends after it starts. The schema checks a new block's, and
// update_block checks a change's against the block it changes.
export function endsAfterStart({
  startsAt,
  endsAt,
}: Pick<BlockFacts, "startsAt" | "endsAt">): boolean {
  return endsAt > startsAt;
}

export const BLOCK_TIMES_MESSAGE = "A block ends after it starts";

// A block as add_blocks takes it: its start and end, effort, title and done-when line, and, for
// one added after the fact, how it went. A block given no state is planned.
const newBlockSchema = z
  .object({
    startsAt: timeSchema,
    endsAt: timeSchema,
    effort: effortSchema,
    title: titleSchema,
    doneWhen: doneWhenSchema.optional(),
    state: stateSchema.optional(),
    whatHappened: whatHappenedSchema.optional(),
  })
  .refine(endsAfterStart, { path: ["endsAt"], error: BLOCK_TIMES_MESSAGE })
  .transform(
    (block): BlockFacts => ({
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      effort: block.effort,
      title: block.title,
      doneWhen: block.doneWhen ?? null,
      state: block.state ?? "planned",
      whatHappened: block.whatHappened ?? null,
    }),
  );

// The most blocks one add_blocks call takes: a full week's, with room.
const BLOCKS_PER_ADD_MAX = 40;

// add_blocks' input (R26, U17): one block, or a week's as Claude drafts it, added together or
// not at all.
export const addBlocksSchema = z.object({
  blocks: z
    .array(newBlockSchema)
    .min(1, { error: "Give at least one block" })
    .max(BLOCKS_PER_ADD_MAX, {
      error: `At most ${BLOCKS_PER_ADD_MAX} blocks at once`,
    }),
});
export type AddBlocksInput = z.output<typeof addBlocksSchema>;

// update_block's input: a change to the facts given, against the updatedAt read with the block
// (R22). Null clears the done-when line or what happened.
export const updateBlockSchema = z.object({
  id: z.uuid(),
  updatedAt: timeSchema,
  startsAt: timeSchema.optional(),
  endsAt: timeSchema.optional(),
  effort: effortSchema.optional(),
  title: titleSchema.optional(),
  doneWhen: doneWhenSchema.optional(),
  state: stateSchema.optional(),
  whatHappened: whatHappenedSchema.optional(),
});
export type UpdateBlockInput = z.output<typeof updateBlockSchema>;

// get_block's input, and deleting's: which block.
export const blockIdSchema = z.object({ id: z.uuid() });

// list_blocks' input: the week holding the day given, this week when none is.
export const listBlocksSchema = z.object({ week: dateSchema.optional() });

// One effort's blocks in a week (R26): those done, those partly done, and all those planned. A
// moved block counts in none of them, since its outcome went to another.
export type EffortCount = {
  effort: Effort;
  done: number;
  partial: number;
  planned: number;
};

// What list_blocks answers: the week by its Monday, its blocks by start, and each effort's counts.
export type BlocksWeek = {
  monday: string;
  blocks: Block[];
  efforts: EffortCount[];
};

// Each effort's counts over the blocks given, in EFFORTS' order, leaving out efforts with none.
export function effortCounts(blocks: Block[]): EffortCount[] {
  return EFFORTS.flatMap((effort) => {
    const counted = blocks.filter(
      (block) => block.effort === effort && block.state !== "moved",
    );
    if (counted.length === 0) {
      return [];
    }
    return [
      {
        effort,
        done: counted.filter(({ state }) => state === "done").length,
        partial: counted.filter(({ state }) => state === "partial").length,
        planned: counted.length,
      },
    ];
  });
}

// How many of the blocks given are done, of those planned (R26): a moved block counts in neither,
// as in effortCounts.
export type BlocksDone = { done: number; planned: number };

export function blocksDone(blocks: Block[]): BlocksDone {
  const planned = blocks.filter(({ state }) => state !== "moved");
  return {
    done: planned.filter(({ state }) => state === "done").length,
    planned: planned.length,
  };
}

// What a delete answers: the block and its day, whose pages listed it.
export type DeletedBlock = { id: string; day: string };
