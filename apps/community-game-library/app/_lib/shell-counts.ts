import { cache } from "react";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { getInjection } from "@/di/container";

// The tabs' counts and the bell's (D14, KTD7), read once a request, however many places show
// them: the bar at the bottom, the bar at the top from 768px, and the bell. Without a member, or
// when the read fails, nothing is counted rather than the page failing.
export const getShellCounts = cache(async () => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }
  try {
    return await getInjection("IGetTabCountsController")(userId);
  } catch (err) {
    getInjection("ILoggerService")
      .child({ layer: "page", op: "getShellCounts" })
      .warn("Counts unread", {
        error: err instanceof Error ? err.name : "unknown",
      });
    return null;
  }
});
