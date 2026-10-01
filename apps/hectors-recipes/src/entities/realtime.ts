// Live updates (ux-plan D21). One channel per plan, since a plan's grocery list lives in it.
// A message only says something changed: the page then reloads what it shows through the
// normal, access-checked path, so a message never carries a list's contents.
export function planChannel(planId: string): string {
  return `plan:${planId}`;
}

export const GROCERY_LIST_CHANGED = "grocery-list-changed";
export type RealtimeEvent = typeof GROCERY_LIST_CHANGED;

// What the browser's realtime client needs to connect for one channel. Its shape belongs to
// the provider, so nothing outside infrastructure looks inside it.
export type RealtimeGrant = object;
