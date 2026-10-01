import type { RealtimeEvent, RealtimeGrant } from "@/src/entities/realtime";

export interface IRealtimeService {
  // Best effort: a failed publish is logged and never fails the write that caused it.
  publish(channel: string, event: RealtimeEvent): Promise<void>;
  // A short-lived pass for one browser to listen to (never publish on) one channel.
  createSubscribeGrant(
    channel: string,
    clientId: string,
  ): Promise<RealtimeGrant>;
}
