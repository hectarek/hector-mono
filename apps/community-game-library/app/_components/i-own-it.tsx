"use client";

import { Button } from "@repo/ui/components/button";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useState,
  useTransition,
} from "react";
import { Stamp } from "@/app/_components/stamp";
import { callAction, callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { useMoment } from "@/app/_lib/use-moment";
import { addCopy, undoAddCopy } from "@/app/actions/copies";

// Add games counts what's added on it (B8's "1 added"); everywhere else nothing counts.
const AddedCount = createContext<{
  count: number;
  change: (by: number) => void;
} | null>(null);

export function AddedTally({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  return (
    <AddedCount
      value={{
        count,
        change: (by) => setCount((now) => Math.max(0, now + by)),
      }}
    >
      {children}
    </AddedCount>
  );
}

// B8's footer line: how many were added here, once there's one.
export function AddedSoFar() {
  const count = useContext(AddedCount)?.count ?? 0;
  return (
    <p
      aria-live="polite"
      className="font-mono text-xs font-medium text-muted-foreground"
    >
      {count > 0 ? `${count} added` : ""}
    </p>
  );
}

// I own it (screens.md, After each action; B8, B10): the game goes on the member's shelf, the row
// is stamped Added with Undo under it, and a message names the game with Undo and Edit copy.
// `quiet` is B5's "I own this too. Add it to my library" under a game's copies.
export function IOwnIt({
  gameId,
  label = "I own it",
  quiet = false,
}: {
  gameId: string;
  label?: string;
  quiet?: boolean;
}) {
  const router = useRouter();
  const tally = useContext(AddedCount);
  const [added, setAdded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Adding plays a moment (U26): the Added stamp presses, or on a catalog row whose cover shows
  // its token, the token lifts out of its ring (app/globals.css).
  const moment = useMoment(added);

  function undo(userGameId: string) {
    startTransition(async () => {
      const error = await callAction(() => undoAddCopy(userGameId, gameId));
      if (error) {
        notify(error);
      } else {
        setAdded(null);
        tally?.change(-1);
      }
    });
  }

  function add() {
    startTransition(async () => {
      const result = await callResultAction(() => addCopy(gameId));
      if (result.error !== undefined) {
        notify(result.error);
        return;
      }
      const { userGameId, message } = result;
      setAdded(userGameId);
      tally?.change(1);
      // B8 and X2 put Undo first, and sonner draws its cancel button before its action; the
      // theme draws both alike.
      notify(message, {
        cancel: { label: "Undo", onClick: () => undo(userGameId) },
        action: {
          label: "Edit copy",
          onClick: () =>
            router.push(`/copies/${userGameId}`, {
              transitionTypes: ["go-deeper"],
            }),
        },
      });
    });
  }

  if (added) {
    return (
      <span
        data-moment={moment.playing ? "add-copy" : undefined}
        className="-mb-2 flex shrink-0 flex-col items-center gap-0.5"
      >
        <Stamp key={moment.key} tone="navy" press={moment.playing}>
          Added
        </Stamp>
        <Button
          variant="link"
          disabled={pending}
          onClick={() => undo(added)}
          className="min-w-11"
        >
          Undo
        </Button>
      </span>
    );
  }
  return (
    <Button
      variant={quiet ? "link" : "secondary"}
      size={quiet ? "default" : "sm"}
      disabled={pending}
      onClick={add}
      className={quiet ? "self-start" : "shrink-0"}
    >
      {label}
    </Button>
  );
}
