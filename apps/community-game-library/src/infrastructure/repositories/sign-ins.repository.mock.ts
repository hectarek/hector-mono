import type { ISignInsRepository } from "@/src/application/repositories/sign-ins.repository.interface";
import { WAYS_IN, type WayIn } from "@/src/entities/ways-in";

export class MockSignInsRepository implements ISignInsRepository {
  // Each account's sign-in by user id, as far as the reads go: its email and its ways in. Neon
  // Auth writes them, never the app, so the tests put them here.
  readonly rows = new Map<string, { email: string; waysIn: WayIn[] }>();
  // Each sign-in anonymized, in order.
  readonly anonymizedUserIds: string[] = [];

  async listEmails(
    userIds: readonly string[],
  ): Promise<{ userId: string; email: string }[]> {
    return [...new Set(userIds)].sort().flatMap((userId) => {
      const signIn = this.rows.get(userId);
      return signIn ? [{ userId, email: signIn.email }] : [];
    });
  }

  async listWaysIn(userId: string): Promise<WayIn[]> {
    const waysIn = this.rows.get(userId)?.waysIn ?? [];
    return WAYS_IN.filter((way) => waysIn.includes(way));
  }

  async anonymize(userId: string): Promise<void> {
    this.anonymizedUserIds.push(userId);
    if (this.rows.has(userId)) {
      this.rows.set(userId, {
        email: `deleted-${userId}@deleted.invalid`,
        waysIn: [],
      });
    }
  }
}
