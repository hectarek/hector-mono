"use client";

import { Button } from "@repo/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { callResultAction } from "@/app/_lib/call-action";
import { deleteAccount } from "@/app/actions/account";

// E8's Delete my account, switched off until every loan is settled, and E9's dialog: what leaves
// with the account, each night that's cancelled, and that it can't be undone. Once it's done the
// device is signed out, and the welcome page opens.
export function DeleteAccount({
  settled,
  games,
  nights,
  asked,
}: {
  settled: boolean;
  games: number;
  // The nights they host that are coming up.
  nights: { id: string; title: string }[];
  // Whether they have requests or places in line.
  asked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function confirm() {
    const result = await callResultAction(deleteAccount);
    if (result?.error !== undefined) {
      return result.error;
    }
    router.push("/welcome");
    return undefined;
  }

  return (
    <>
      <Button
        variant="destructive"
        size="lg"
        disabled={!settled}
        onClick={() => setOpen(true)}
      >
        Delete my account
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete your account?"
        confirmLabel="Delete my account"
        keepLabel="Keep my account"
        onConfirm={confirm}
      >
        <ul className="flex flex-col gap-2.5">
          {games > 0 && (
            <li>
              {games === 1
                ? "Your game leaves your friends’ libraries."
                : `Your ${games} games leave your friends’ libraries.`}
            </li>
          )}
          {nights.map(({ id, title }) => (
            <li key={id}>{title} is cancelled and everyone is told.</li>
          ))}
          {asked && <li>Your requests and your places in line end.</li>}
          <li className="font-bold">This can’t be undone.</li>
        </ul>
      </ConfirmDialog>
    </>
  );
}
