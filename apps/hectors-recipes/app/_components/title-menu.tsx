"use client";

import { Button } from "@repo/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/components/drawer";
import { Ellipsis } from "lucide-react";
import type { ReactNode } from "react";

// The ⋯ beside a tab's title (docs/ux-plan.md D42): a bottom sheet with what you can do with
// what the tab shows (invite, members, defaults), kept out of the tab's way.
export function TitleMenu({
  name,
  title = name,
  description,
  onOpenChange,
  children,
}: {
  // What the tab shows, for the button's label.
  name: string;
  title?: string;
  description?: string;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Drawer onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerTrigger
        render={
          <Button
            variant="secondary"
            size="icon-lg"
            aria-label={`More for ${name}`}
          />
        }
      >
        <Ellipsis />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="pb-safe-4 flex flex-col gap-3 px-4 pt-4">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
