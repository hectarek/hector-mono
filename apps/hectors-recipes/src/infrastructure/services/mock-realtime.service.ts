import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import { LiveUpdatesOffError } from "@/src/entities/errors/common";
import type { RealtimeEvent, RealtimeGrant } from "@/src/entities/realtime";

// Records what would have been published, for tests to check. `off` stands in for no key.
export class MockRealtimeService implements IRealtimeService {
  readonly published: { channel: string; event: RealtimeEvent }[] = [];
  off = false;

  async publish(channel: string, event: RealtimeEvent): Promise<void> {
    this.published.push({ channel, event });
  }

  async createSubscribeGrant(
    channel: string,
    clientId: string,
  ): Promise<RealtimeGrant> {
    if (this.off) throw new LiveUpdatesOffError();
    return { channel, clientId, capability: ["subscribe"] };
  }
}
