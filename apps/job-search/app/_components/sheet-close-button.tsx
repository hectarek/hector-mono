import { Button } from "@repo/ui/components/button";
import { SheetClose } from "@repo/ui/components/sheet";
import { XIcon } from "lucide-react";

// A sheet's close control at the build's 44 px touch target, where the registry's Sheet draws its
// own as a 28 px icon button. Each sheet turns that one off (`showCloseButton={false}`) and shows
// this in its place; Escape and a tap outside still close it.
export function SheetCloseButton() {
  return (
    <SheetClose
      render={
        <Button
          variant="ghost"
          size="icon-lg"
          className="absolute top-2 right-2 min-h-11 min-w-11"
        />
      }
    >
      <XIcon />
      <span className="sr-only">Close</span>
    </SheetClose>
  );
}
