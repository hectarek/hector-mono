import type {
  IInteractionsRepository,
  NewInteraction,
} from "@/src/application/repositories/interactions.repository.interface";
import { byCodePoint } from "@/src/entities/code-point-order";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  ConversationState,
  Interaction,
  InteractionKind,
} from "@/src/entities/models/interaction.model";
import type { PersonDates } from "@/src/entities/models/person.model";
import type { WeeklyCounts } from "@/src/entities/weekly-counts";

// The interactions in memory. A person's list runs as the table's does: the latest day first, then
// the latest logged.
export class MockInteractionsRepository implements IInteractionsRepository {
  private readonly rows: {
    ownerId: string;
    interaction: Interaction;
    added: number;
  }[] = [];
  private added = 0;

  async add(
    ownerId: string,
    interaction: NewInteraction,
  ): Promise<Interaction> {
    const stored: Interaction = {
      ...interaction,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.added += 1;
    this.rows.push({ ownerId, interaction: stored, added: this.added });
    return { ...stored };
  }

  async getForUpdate(
    ownerId: string,
    id: string,
  ): Promise<Interaction | undefined> {
    const row = this.rowOf(ownerId, id);
    return row && { ...row.interaction };
  }

  async setOutcome(
    ownerId: string,
    id: string,
    { state, note }: { state: ConversationState; note?: string | null },
  ): Promise<Interaction> {
    const row = this.rowOf(ownerId, id);
    if (!row) {
      throw new DatabaseOperationError("setOutcome found no interaction");
    }
    row.interaction = {
      ...row.interaction,
      state,
      ...(note !== undefined && { note }),
    };
    return { ...row.interaction };
  }

  async delete(ownerId: string, id: string): Promise<void> {
    this.remove((row) => row.ownerId === ownerId && row.interaction.id === id);
  }

  async listForPerson(
    ownerId: string,
    personId: string,
  ): Promise<Interaction[]> {
    return this.rows
      .filter(
        (row) =>
          row.ownerId === ownerId && row.interaction.personId === personId,
      )
      .sort(
        (a, b) =>
          byCodePoint(b.interaction.occurredOn, a.interaction.occurredOn) ||
          b.interaction.createdAt.getTime() -
            a.interaction.createdAt.getTime() ||
          b.added - a.added,
      )
      .map((row) => ({ ...row.interaction }));
  }

  async datesFor(
    ownerId: string,
    personIds: string[],
  ): Promise<Map<string, PersonDates>> {
    const dates = new Map<string, PersonDates>();
    for (const personId of personIds) {
      const theirs = this.rows
        .filter(
          (row) =>
            row.ownerId === ownerId && row.interaction.personId === personId,
        )
        .map((row) => row.interaction);
      if (theirs.length) {
        dates.set(personId, {
          messagedOn: latest(theirs, "message-sent"),
          repliedOn: latest(theirs, "reply-received"),
          metOn: latest(
            theirs.filter((interaction) => interaction.state === "held"),
            "conversation",
          ),
        });
      }
    }
    return dates;
  }

  async repliedOnFor(ownerId: string, jobId: string): Promise<string | null> {
    return latest(
      this.rows
        .filter(
          (row) => row.ownerId === ownerId && row.interaction.jobId === jobId,
        )
        .map((row) => row.interaction),
      "reply-received",
    );
  }

  async listScheduled(ownerId: string): Promise<Interaction[]> {
    return this.rows
      .filter(
        (row) =>
          row.ownerId === ownerId && row.interaction.state === "scheduled",
      )
      .map((row) => ({ ...row.interaction }))
      .sort(
        (a, b) =>
          (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0) ||
          byCodePoint(a.id, b.id),
      );
  }

  async countInRange(
    ownerId: string,
    from: string,
    to: string,
  ): Promise<Pick<WeeklyCounts, "messagesSent" | "conversationsHeld">> {
    const inRange = this.rows
      .filter(
        (row) =>
          row.ownerId === ownerId &&
          row.interaction.occurredOn >= from &&
          row.interaction.occurredOn <= to,
      )
      .map((row) => row.interaction);
    return {
      messagesSent: inRange.filter(({ kind }) => kind === "message-sent")
        .length,
      conversationsHeld: inRange.filter(
        ({ kind, state }) => kind === "conversation" && state === "held",
      ).length,
    };
  }

  async deleteForPerson(ownerId: string, personId: string): Promise<void> {
    this.remove(
      (row) => row.ownerId === ownerId && row.interaction.personId === personId,
    );
  }

  async unlinkJob(ownerId: string, jobId: string): Promise<void> {
    for (const row of this.rows) {
      if (row.ownerId === ownerId && row.interaction.jobId === jobId) {
        row.interaction = { ...row.interaction, jobId: null };
      }
    }
  }

  private rowOf(ownerId: string, id: string) {
    return this.rows.find(
      (row) => row.ownerId === ownerId && row.interaction.id === id,
    );
  }

  private remove(matches: (row: (typeof this.rows)[number]) => boolean) {
    for (let index = this.rows.length - 1; index >= 0; index -= 1) {
      const row = this.rows[index];
      if (row && matches(row)) {
        this.rows.splice(index, 1);
      }
    }
  }
}

// The latest day an interaction of the kind happened, or null when none did.
function latest(
  interactions: Interaction[],
  kind: InteractionKind,
): string | null {
  return interactions
    .filter((interaction) => interaction.kind === kind)
    .map((interaction) => interaction.occurredOn)
    .reduce<string | null>(
      (max, day) => (max === null || day > max ? day : max),
      null,
    );
}
