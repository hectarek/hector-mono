"use client";

import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { Piece } from "@/app/_components/piece";
import { callAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { shareOrCopy } from "@/app/_lib/share";
import { callBack } from "@/app/actions/loans";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { callBackMessage } from "@/src/entities/share-message";

// C7's Call it back, after C15's dialog (R20): the borrower is asked to bring it back now, and
// since a notice is seen only when the app is opened, the message offers Text Jo too, which hands
// the phone's share sheet a ready message (R52; C18). Whoever is first in line keeps their place,
// in a bone box with their piece, as C15 draws it.
export function CallBackButton({
  loanId,
  title,
  borrower,
  overdue,
  next,
}: {
  loanId: string;
  title: string;
  borrower: string;
  overdue: boolean;
  next: NameAndPiece | null;
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
        <p>
          {borrower} is asked to give {title} back now. It goes to their inbox,
          so they see it when they next open the app.
        </p>
        {overdue && <p>It stays overdue until you confirm it’s back.</p>}
        {next && (
          <div className="flex items-center gap-2.5 rounded-lg border-2 border-foreground bg-secondary p-3">
            <Piece shape={next.pieceShape} color={next.pieceColor} size={16} />
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-13">
              <p className="font-bold text-foreground">
                {next.name} keeps their place
              </p>
              <p>{next.name} is 1st in line and is told when it’s back.</p>
            </div>
          </div>
        )}
      </ConfirmDialog>
    </>
  );
}
