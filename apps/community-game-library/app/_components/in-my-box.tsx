"use client";

import { Button } from "@repo/ui/components/button";
import { useState, useTransition } from "react";
import { Stamp } from "@/app/_components/stamp";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { putInBox } from "@/app/actions/copies";
import type { ActionState } from "@/app/actions/shared";

// In my box (screens.md, After each action; B8, B10): an expansion of a game you own goes in its
// box, with a message naming both. The row then reads In the box, as one that's there already
// does.
export function InMyBox({ gameId, boxed }: { gameId: string; boxed: boolean }) {
  const [inTheBox, setInTheBox] = useState(boxed);
  const [pending, startTransition] = useTransition();

  function put() {
    startTransition(async () => {
      const result: ActionState = await callResultAction(() =>
        putInBox(gameId),
      );
      if (result?.error !== undefined) {
        notify(result.error);
        return;
      }
      setInTheBox(true);
      if (result?.message) {
        notify(result.message);
      }
    });
  }

  if (inTheBox) {
    return (
      <span className="shrink-0">
        <Stamp tone="navy">In the box</Stamp>
      </span>
    );
  }
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={put}
      className="shrink-0"
    >
      In my box
    </Button>
  );
}
