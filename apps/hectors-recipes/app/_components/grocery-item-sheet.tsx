"use client";

import { Button } from "@repo/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import { Input } from "@repo/ui/components/input";
import { Pencil, Trash2 } from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { callAction } from "@/app/_lib/call-action";
import { updateGroceryItem } from "@/app/actions/grocery";
import type { GroceryItem } from "@/src/entities/models/grocery-item.model";

// A grocery item's actions, as a bottom sheet (the design system's pattern for short
// tasks): big targets for thumbs, and no keyboard until Edit is tapped.
export function GroceryItemSheet({
  item,
  open,
  onOpenChange,
  onRemove,
}: {
  item: GroceryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function changeOpen(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setEditing(false);
      setError(undefined);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("text") ?? "");
    // Unchanged: nothing to save, and saving would drop the parsed amount for no reason.
    if (text.trim() === item.text) {
      changeOpen(false);
      return;
    }
    startTransition(async () => {
      const failed = await callAction(() => updateGroceryItem(item.id, text));
      if (failed) {
        setError(failed);
        return;
      }
      changeOpen(false);
    });
  }

  return (
    <Drawer open={open} onOpenChange={changeOpen} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{item.text}</DrawerTitle>
          {item.sourceNote && (
            <DrawerDescription>For {item.sourceNote}</DrawerDescription>
          )}
        </DrawerHeader>

        <div className="pb-safe-4 flex flex-col gap-3 px-4 pt-4">
          {editing ? (
            <form onSubmit={save} className="flex flex-col gap-3">
              <Input
                ref={inputRef}
                name="text"
                defaultValue={item.text}
                aria-label="Item"
                maxLength={200}
                required
              />
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                <Pencil data-icon="inline-start" />
                Edit
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => {
                  changeOpen(false);
                  onRemove();
                }}
              >
                <Trash2 data-icon="inline-start" />
                Remove from list
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
