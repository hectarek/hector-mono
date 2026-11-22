"use client";

import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { callAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { shareOrCopy } from "@/app/_lib/share";
import { callBack } from "@/app/actions/loans";
import { callBackMessage } from "@/src/entities/share-message";

// C7's Call it back, after C15's dialog (R20): the borrower is asked to bring it back now, and
// since a notice is seen only when the app is opened, the message offers Text Jo too, which hands
// the phone's share sheet a ready message (R52; C18).
export function CallBackButton({
  loanId,
  title,
  borrower,
  overdue,
  nextName,
}: {
  loanId: string;
  title: string;
  borrower: string;
  overdue: boolean;
  nextName: string | null;
}) {
  const [open, setOpen] = useState(false);

  async function confirm() {
    const failed = await callAction(() => callBack(loanId, borrower));
    if (failed) {
      return failed;
    }
    notify(`${borrower} is asked to bring it back.`, {
      action: {
        label: `Text ${borrower} too`,
        onClick: () => {
          void shareOrCopy({ text: callBackMessage(title) });
        },
      },
    });
    return undefined;
  }

  return (
    <>
      <Button
        variant="destructive"
        size="lg"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        Call it back
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Call ${title} back?`}
        confirmLabel="Call it back"
        keepLabel={`Leave it with ${borrower}`}
        onConfirm={confirm}
      >
        <span className="flex flex-col gap-2.5">
          <span>
            {borrower} is asked to give {title} back now. It goes to their
            inbox, so they see it when they next open the app.
          </span>
          {overdue && (
            <span>It stays overdue until you confirm it’s back.</span>
          )}
          {nextName && (
            <span>
              {nextName} keeps their place: 1st in line, and told when it’s
              back.
            </span>
          )}
        </span>
      </ConfirmDialog>
    </>
  );
}
