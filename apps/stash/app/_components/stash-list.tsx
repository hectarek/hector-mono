"use client";

import { Progress } from "@repo/ui/components/progress";
import { Separator } from "@repo/ui/components/separator";
import type { StashItem } from "@/src/entities/models/stash-item.model";
import { EmptyStash } from "./empty-stash";
import { StashItemCard } from "./stash-item-card";

export function StashList({
  queued,
  completed,
}: {
  queued: StashItem[];
  completed: StashItem[];
}) {
  const total = queued.length + completed.length;
  const completedCount = completed.length;
  const progressPercent = total > 0 ? (completedCount / total) * 100 : 0;

  if (total === 0) {
    return <EmptyStash hasCompletedItems={false} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {total > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground tabular-nums">
              {completedCount}/{total}
            </span>
          </div>
          <Progress value={progressPercent} />
        </div>
      )}

      {queued.length === 0 && completed.length > 0 ? (
        <EmptyStash hasCompletedItems />
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Up Next ({queued.length})
          </h2>
          {queued.map((item) => (
            <StashItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Completed ({completed.length})
            </h2>
            {completed.map((item) => (
              <StashItemCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
