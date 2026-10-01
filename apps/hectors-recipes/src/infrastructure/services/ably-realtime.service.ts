import { Rest, type TokenParams, type TokenRequest } from "ably";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import type { RealtimeEvent, RealtimeGrant } from "@/src/entities/realtime";

// The part of Ably's REST client this uses, so tests can pass a stand-in without a network.
export type AblyRestClient = {
  channels: {
    get(name: string): { publish(name: string, data: null): Promise<unknown> };
  };
  auth: { createTokenRequest(params: TokenParams): Promise<TokenRequest> };
};

function defaultClient(): AblyRestClient | null {
  const key = process.env.ABLY_API_KEY;
  return key ? new Rest({ key }) : null;
}

// Ably, the only place that knows it's Ably (ux-plan D21). The key (server-only) is limited
// to publish and subscribe on plan:*, and a pass gets only the intersection of what it asks
// for and what the key allows. Without a key, live updates are off: publishing does nothing
// and pages fall back to refreshing on focus and on a timer.
export class AblyRealtimeService implements IRealtimeService {
  private readonly logger: ILoggerService;

  constructor(
    logger: ILoggerService,
    // null: no key, so live updates are off.
    private readonly client: AblyRestClient | null = defaultClient(),
  ) {
    this.logger = logger.child({ layer: "service", op: "realtime" });
  }

  async publish(channel: string, event: RealtimeEvent): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.channels.get(channel).publish(event, null);
    } catch (err) {
      this.logger.warn("Publish failed", {
        channel,
        event,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async createSubscribeGrant(
    channel: string,
    clientId: string,
  ): Promise<RealtimeGrant> {
    if (!this.client) {
      throw new Error("Live updates aren't configured (ABLY_API_KEY)");
    }
    return this.client.auth.createTokenRequest({
      clientId,
      capability: { [channel]: ["subscribe"] },
    });
  }
}
