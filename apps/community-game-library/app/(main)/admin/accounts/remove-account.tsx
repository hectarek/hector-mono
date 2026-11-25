"use client";

import { Button } from "@repo/ui/components/button";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { Group } from "@/app/_components/group";
import { RowFacts, RowName } from "@/app/_components/list-row";
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

// G8's two groups. Find the account holds the search, the accounts it finds and the one picked
// (the only one found is picked already). On the record holds the removal, switched off while the
// account has a loan to settle and asking first ("Remove Dev's account?"); Admin opens after, with
// the message. The page draws the search, which keeps what's typed as the results change.
export function RemoveAccount({
  search,
  searched,
  accounts,
}: {
  search: ReactNode;
  // Something was typed, so finding nobody says so.
  searched: boolean;
  accounts: Found[];
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const account =
    accounts.find((one) => one.userId === chosen) ??
    (accounts.length === 1 ? accounts[0] : undefined);

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
      <Group label="Find the account">
        {search}
        {searched && accounts.length === 0 && (
          <p className="text-13 text-muted-foreground">
            No account has that name.
          </p>
        )}
        {accounts.length > 0 && (
          <RadioGroup
            aria-label="Accounts found"
            value={account?.userId ?? ""}
            onValueChange={setChosen}
          >
            <ul className="flex flex-col *:border-dashed *:border-foreground *:not-first:border-t-2">
              {accounts.map((one) => (
                <li
                  key={one.userId}
                  className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0"
                >
                  <RadioGroupItem
                    id={`account-${one.userId}`}
                    value={one.userId}
                  />
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
                </li>
              ))}
            </ul>
          </RadioGroup>
        )}
      </Group>
      {account && (
        <Group label="On the record">
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
            className="self-center"
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
        </Group>
      )}
    </>
  );
}
