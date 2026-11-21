"use client";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { createContext, type ReactNode, useContext } from "react";
import { CloseIcon } from "@/app/_components/icons";
import { useClosesOnLeave } from "@/app/_lib/use-closes-on-leave";

const CloseSheet = createContext<() => void>(() => {});

// A short task that belongs to the page behind (the design system's Sheet): ask to borrow,
// answer a night, sort, pick a date. On a phone it rises from the bottom (the Drawer); from 768px
// it's a centered dialog 480 wide with the same content (KTD14, Wide3). Its title is a stencil
// heading with a close button beside it; its content sits 14px apart and ends in SheetActions.
// Like recipes' sheets, it closes as the page is left (useClosesOnLeave, recipes' D88).
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const phone = useIsMobile();
  const sheetKey = useClosesOnLeave(() => {
    if (open) onOpenChange(false);
  });
  const close = () => onOpenChange(false);
  const closeButton = (
    <button
      type="button"
      aria-label="Close"
      className="-mt-1.5 -mr-2 flex size-11 shrink-0 items-center justify-center text-foreground hover:text-destructive"
    />
  );

  if (phone) {
    return (
      <CloseSheet.Provider value={close}>
        <Drawer key={sheetKey} open={open} onOpenChange={onOpenChange}>
          <DrawerContent>
            <div className="flex flex-col gap-3.5 overflow-y-auto p-4">
              <div className="flex items-start justify-between gap-2.5">
                <DrawerTitle className="mt-2">{title}</DrawerTitle>
                <DrawerClose render={closeButton}>
                  <CloseIcon className="size-5.5" strokeWidth={2.4} />
                </DrawerClose>
              </div>
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      </CloseSheet.Provider>
    );
  }
  return (
    <CloseSheet.Provider value={close}>
      <Dialog key={sheetKey} open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false}>
          <div className="flex items-start justify-between gap-2.5">
            <DialogTitle className="mt-2">{title}</DialogTitle>
            <DialogClose render={closeButton}>
              <CloseIcon className="size-5.5" strokeWidth={2.4} />
            </DialogClose>
          </div>
          {children}
        </DialogContent>
      </Dialog>
    </CloseSheet.Provider>
  );
}

// A sheet's actions: its one primary, full width, then a quiet Cancel that closes it.
export function SheetActions({ children }: { children: ReactNode }) {
  const close = useContext(CloseSheet);
  return (
    <div className="flex flex-col gap-1">
      {children}
      <Button
        type="button"
        variant="link"
        className="self-center"
        onClick={close}
      >
        Cancel
      </Button>
    </div>
  );
}
