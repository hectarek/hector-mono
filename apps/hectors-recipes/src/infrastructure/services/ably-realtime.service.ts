import type { TokenParams, TokenRequest } from "ably";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import { LiveUpdatesOffError } from "@/src/entities/errors/common";
import type { RealtimeEvent, RealtimeGrant } from "@/src/entities/realtime";

// The part of Ably's REST client this uses, so tests can pass a stand-in without a network.
export type AblyRestClient = {
  channels: {
    get(name: string): { publish(name: string, data: null): Promise<unknown> };
  };
  auth: { createTokenRequest(params: TokenParams): Promise<TokenRequest> };
};

// Ably's SDK loads on the first publish or pass, not when a server function starts: the DI
// container builds this adapter for every request, and most requests never use it (P30.2).
async function defaultClient(): Promise<AblyRestClient | null> {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  const { Rest } = await import("ably");
  return new Rest({ key });
}

// Ably, the only place that knows it's Ably (ux-plan D21). The key (server-only) is limited
// to publish and subscribe on plan:*, and a pass gets only the intersection of what it asks
// for and what the key allows. Without a key, live updates are off: publishing does nothing
// and pages fall back to refreshing on focus and on a timer.
export class AblyRealtimeService implements IRealtimeService {
  private readonly logger: ILoggerService;
  private client: Promise<AblyRestClient | null> | undefined;

  constructor(
    logger: ILoggerService,
    // A stand-in for tests (null: no key, so live updates are off). Left out, Ably's own
    // client, made on first use.
    private readonly givenClient?: AblyRestClient | null,
  ) {
    this.logger = logger.child({ layer: "service", op: "realtime" });
  }

  private getClient(): Promise<AblyRestClient | null> {
    this.client ??=
      this.givenClient === undefined
        ? defaultClient()
        : Promise.resolve(this.givenClient);
    return this.client;
  }

  async publish(channel: string, event: RealtimeEvent): Promise<void> {
    try {
      // Inside the try: not even a failure to load Ably may fail the write before it (D21).
      const client = await this.getClient();
      if (!client) return;
      await client.channels.get(channel).publish(event, null);
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
    const client = await this.getClient();
    if (!client) {
      throw new LiveUpdatesOffError(
        "Live updates aren't configured (ABLY_API_KEY)",
      );
    }
    return client.auth.createTokenRequest({
      clientId,
      capability: { [channel]: ["subscribe"] },
    });
  }
}
