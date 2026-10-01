import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import type { RealtimeEvent, RealtimeGrant } from "@/src/entities/realtime";

// Records what would have been published, for tests to check.
export class MockRealtimeService implements IRealtimeService {
  readonly published: { channel: string; event: RealtimeEvent }[] = [];

  async publish(channel: string, event: RealtimeEvent): Promise<void> {
    this.published.push({ channel, event });
  }

  async createSubscribeGrant(
    channel: string,
    clientId: string,
  ): Promise<RealtimeGrant> {
    return { channel, clientId, capability: ["subscribe"] };
  }
}
