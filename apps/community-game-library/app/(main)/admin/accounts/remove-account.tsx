"use client";

import { Button } from "@repo/ui/components/button";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { List, ListItem, RowFacts, RowName } from "@/app/_components/list-row";
import { Piece } from "@/app/_components/piece";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { removeAccount } from "@/app/actions/admin";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { formatSince } from "@/src/entities/week";

type Found = NameAndPiece & {
  // When the account was made, as an ISO time.
  joined: string;
  games: number;
  openLoans: number;
};

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

// G8's accounts found, one to pick, and its removal: switched off while the account has a loan to
// settle, and asking first ("Remove Dev's account?"). Admin opens after, with the message.
export function RemoveAccount({ accounts }: { accounts: Found[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState(
    accounts.length === 1 ? accounts[0]?.userId : undefined,
  );
  const [open, setOpen] = useState(false);
  const account = accounts.find((one) => one.userId === picked);

  async function confirm() {
    if (!account) {
      return undefined;
    }
    const result = await callResultAction(() => removeAccount(account.userId));
    if (result?.error !== undefined) {
      return result.error;
    }
    router.push("/admin");
    notify(
      result && "message" in result && result.message
        ? result.message
        : `${account.name}’s account is removed`,
    );
    return undefined;
  }

  return (
    <>
      <RadioGroup
        aria-label="Accounts found"
        value={picked ?? ""}
        onValueChange={setPicked}
      >
        <List>
          {accounts.map((one) => (
            <ListItem key={one.userId}>
              <RadioGroupItem id={`account-${one.userId}`} value={one.userId} />
              <label
                htmlFor={`account-${one.userId}`}
                className="flex min-h-11 flex-1 items-center gap-2.5"
              >
                <Piece
                  shape={one.pieceShape}
                  color={one.pieceColor}
                  size={20}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <RowName>{one.name}</RowName>
                  <RowFacts>
                    Joined {formatSince(new Date(one.joined))}
                  </RowFacts>
                  <RowFacts>
                    {count(one.games, "game", "games")} ·{" "}
                    {count(one.openLoans, "open loan", "open loans")}
                  </RowFacts>
                </span>
              </label>
            </ListItem>
          ))}
        </List>
      </RadioGroup>
      {account && (
        <div className="flex flex-col gap-2.5">
          {account.openLoans > 0 && (
            <p className="text-13 leading-snug text-muted-foreground">
              {account.name}’s loans have to be settled first.
            </p>
          )}
          <Button
            variant="destructive"
            size="lg"
            disabled={account.openLoans > 0}
            onClick={() => setOpen(true)}
          >
            Remove {account.name}’s account
          </Button>
          <Button
            variant="quiet"
            size="lg"
            nativeButton={false}
            render={<Link href="/admin" />}
          >
            Cancel
          </Button>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title={`Remove ${account.name}’s account?`}
            confirmLabel={`Remove ${account.name}’s account`}
            keepLabel="Keep it"
            onConfirm={confirm}
          >
            {account.name} can’t sign in again. Their games disappear from
            everyone’s library. This can’t be undone.
          </ConfirmDialog>
        </div>
      )}
    </>
  );
}
