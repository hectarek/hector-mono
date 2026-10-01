import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import { GROCERY_LIST_CHANGED, planChannel } from "@/src/entities/realtime";

// Tells anyone looking at a plan's grocery list that it changed (ux-plan D21). Call it once
// the write has committed, or their page reloads before the change is there to see.
export function listChanged(
  realtimeService: IRealtimeService,
  planId: string,
): Promise<void> {
  return realtimeService.publish(planChannel(planId), GROCERY_LIST_CHANGED);
}
