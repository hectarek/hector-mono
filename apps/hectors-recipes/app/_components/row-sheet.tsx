"use client";

import { Button } from "@repo/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useClosesWhenHidden } from "@/app/_lib/use-closes-when-hidden";

// A row's ⋯ sheet in the recipe editor: its own fields (if any), then move and remove.
// Changes apply as they're made, so Done only closes it; the sheet stays open while a row is
// moved, so it can be moved several places.
export function RowSheet({
  title,
  open,
  onOpenChange,
  canMoveUp,
  canMoveDown,
  onMove,
  onRemove,
  children,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  children?: ReactNode;
}) {
  useClosesWhenHidden(() => {
    if (open) onOpenChange(false);
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="pb-safe-4 flex flex-col gap-4 px-4 pt-4">
          {children}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              disabled={!canMoveUp}
              onClick={() => onMove(-1)}
            >
              <ArrowUp data-icon="inline-start" />
              Move up
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              disabled={!canMoveDown}
              onClick={() => onMove(1)}
            >
              <ArrowDown data-icon="inline-start" />
              Move down
            </Button>
          </div>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            onClick={onRemove}
          >
            <Trash2 data-icon="inline-start" />
            Remove
          </Button>
          <Button type="button" size="lg" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
