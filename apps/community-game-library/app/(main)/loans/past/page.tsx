import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { CoverThumb } from "@/app/_components/cover-thumb";
import {
  List,
  ListItem,
  RowFacts,
  RowLine,
  RowName,
} from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { coverColorOf } from "@/src/entities/piece";
import { formatMonthDay } from "@/src/entities/week";

// Past loans (C12, R23): what the member borrowed, or with ?show=lent what they lent, newest
// return first, each with its game, who it was from or to, its dates, and how late it came back.
export default async function PastLoansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { user } = await gate("app");
  const { show } = await searchParams;
  const side = show === "lent" ? "lent" : "borrowed";
  const past = await getInjection("IListPastLoansController")(user.id);
  const loans = past[side];
  const toggle = (which: "borrowed" | "lent", words: string) => (
    <Button
      size="sm"
      variant={side === which ? "default" : "secondary"}
      nativeButton={false}
      render={
        <Link
          href={which === "lent" ? "/loans/past?show=lent" : "/loans/past"}
          replace
          scroll={false}
        />
      }
      aria-pressed={side === which}
    >
      {words}
    </Button>
  );

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/loans", label: "Loans" }} />}
    >
      <h1 className="text-2xl leading-7 font-bold">Past loans</h1>
      <div className="flex gap-2">
        {toggle("borrowed", "You borrowed")}
        {toggle("lent", "You lent")}
      </div>
      {loans.length > 0 ? (
        <>
          <p className="font-mono text-xs font-medium text-muted-foreground">
            {loans.length === 1 ? "1 loan" : `${loans.length} loans`}, newest
            first
          </p>
          <List>
            {loans.map(({ loan, game, other, daysLate }) => (
              <ListItem key={loan.id}>
                <CoverThumb
                  color={coverColorOf(game)}
                  imageUrl={game.imageUrl}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <RowName>{game.title}</RowName>
                  <RowLine>
                    <Piece
                      shape={other.pieceShape}
                      color={other.pieceColor}
                      size={11}
                    />
                    {side === "borrowed"
                      ? `From ${other.name}`
                      : `To ${other.name}`}
                  </RowLine>
                  {loan.pickedUpOn && loan.returnedOn && (
                    <RowFacts>
                      {formatMonthDay(loan.pickedUpOn)} to{" "}
                      {formatMonthDay(loan.returnedOn)}
                    </RowFacts>
                  )}
                </span>
                {daysLate > 0 && (
                  <Stamp tone="brown">
                    {daysLate === 1 ? "1 day late" : `${daysLate} days late`}
                  </Stamp>
                )}
              </ListItem>
            ))}
          </List>
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>
              {past.borrowed.length + past.lent.length === 0
                ? "Nothing borrowed or lent yet."
                : side === "borrowed"
                  ? "Nothing borrowed yet."
                  : "Nothing lent yet."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </PageColumn>
  );
}
