import { describe, expect, it } from "bun:test";
import type { TokenParams, TokenRequest } from "ably";
import { LiveUpdatesOffError } from "@/src/entities/errors/common";
import {
  AblyRealtimeService,
  type AblyRestClient,
} from "@/src/infrastructure/services/ably-realtime.service";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";

// A stand-in for Ably's REST client: records what it's asked, and can fail on publish.
function fakeClient({ failPublish = false } = {}) {
  const calls = {
    published: [] as { channel: string; event: string }[],
    tokenParams: [] as TokenParams[],
  };
  const client: AblyRestClient = {
    channels: {
      get: (channel) => ({
        publish: async (event) => {
          if (failPublish) throw new Error("Ably is down");
          calls.published.push({ channel, event });
        },
      }),
    },
    auth: {
      createTokenRequest: async (params) => {
        calls.tokenParams.push(params);
        return { keyName: "app.key", mac: "mac" } as TokenRequest;
      },
    },
  };
  return { client, calls };
}

describe("AblyRealtimeService", () => {
  it("publishes on the channel, and a failed publish never throws", async () => {
    const ok = fakeClient();
    await new AblyRealtimeService(new MockLoggerService(), ok.client).publish(
      "plan:1",
      "grocery-list-changed",
    );
    expect(ok.calls.published).toEqual([
      { channel: "plan:1", event: "grocery-list-changed" },
    ]);

    const down = fakeClient({ failPublish: true });
    await expect(
      new AblyRealtimeService(new MockLoggerService(), down.client).publish(
        "plan:1",
        "grocery-list-changed",
      ),
    ).resolves.toBeUndefined();
  });

  it("grants one client subscribe on one channel, nothing else", async () => {
    const { client, calls } = fakeClient();
    await new AblyRealtimeService(
      new MockLoggerService(),
      client,
    ).createSubscribeGrant("plan:1", "user-1");
    expect(calls.tokenParams).toEqual([
      { clientId: "user-1", capability: { "plan:1": ["subscribe"] } },
    ]);
  });

  it("without a key, publishing does nothing and a grant is refused", async () => {
    const service = new AblyRealtimeService(new MockLoggerService(), null);
    await expect(
      service.publish("plan:1", "grocery-list-changed"),
    ).resolves.toBeUndefined();
    await expect(
      service.createSubscribeGrant("plan:1", "user-1"),
    ).rejects.toBeInstanceOf(LiveUpdatesOffError);
  });
});
