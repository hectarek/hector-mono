import type { ISignInsRepository } from "@/src/application/repositories/sign-ins.repository.interface";

export class MockSignInsRepository implements ISignInsRepository {
  // Each sign-in anonymized, in order.
  readonly anonymizedUserIds: string[] = [];

  async anonymize(userId: string): Promise<void> {
    this.anonymizedUserIds.push(userId);
  }
}
