import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Group } from "@/app/_components/group";
import { ForwardIcon } from "@/app/_components/icons";
import { List, ListRow, RowFacts, RowName } from "@/app/_components/list-row";
import { LoanTrack } from "@/app/_components/loan-track";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import type { DI_RETURN_TYPES } from "@/di/types";
import { copyState, ordinal } from "@/src/entities/loan";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { coverColorOf } from "@/src/entities/piece";
import {
  formatDate,
  formatMonthDay,
  formatWhen,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";

type Item = Awaited<
  ReturnType<DI_RETURN_TYPES["IListLoansController"]>
>["borrowed"][number];

// A person beside their piece, in a loan card's line ("From Sam", "Jo is 1st in line").
function PersonLine({
  person,
  children,
}: {
  person: NameAndPiece;
  children: string;
}) {
  return (
    <span className="flex items-center gap-1.25 whitespace-nowrap">
      <Piece shape={person.pieceShape} color={person.pieceColor} size={11} />
      {children}
    </span>
  );
}

// A loan that's out, or said yes to, on Loans (C4): a card that opens the loan, with its game,
// its stamp and the chevron on top, the track with the borrower's piece across it while it's out,
// then one line of who it's from or with and who's next in line.
function LoanCard({
  item,
  side,
  borrower,
  today,
}: {
  item: Item;
  side: "borrowed" | "lent";
  borrower: NameAndPiece;
  today: string;
}) {
  const { loan, copy, game, other, next } = item;
  const viewer = side === "borrowed" ? loan.borrowerUserId : copy.userId;
  const { stamp } = copyState(copy, [loan], viewer, today);
  return (
    <li>
      <Link
        href={`/loans/${loan.id}`}
        transitionTypes={["go-deeper"]}
        className="flex flex-col gap-2 rounded-lg border-2 border-foreground bg-card px-3.5 py-3 text-foreground hover:text-destructive"
      >
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 text-base font-bold">{game.title}</h3>
          <Stamp tone={stamp.tone} size="card" tilt={3}>
            {stamp.word}
          </Stamp>
          <ForwardIcon className="-mr-2 -ml-0.5" />
        </div>
        {loan.status === "out" && loan.pickedUpOn && loan.dueOn && (
          <LoanTrack
            pickedUpOn={loan.pickedUpOn}
            dueOn={loan.dueOn}
            today={today}
            borrower={borrower}
          />
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-13 text-muted-foreground">
          <PersonLine person={other}>
            {side === "borrowed"
              ? `From ${other.name}`
              : loan.status === "accepted"
                ? `${other.name} hasn’t picked it up yet`
                : `${other.name} has it`}
          </PersonLine>
          {next && (
            <PersonLine
              person={next}
            >{`${next.name} is 1st in line`}</PersonLine>
          )}
        </div>
      </Link>
    </li>
  );
}

// Loans (C4, R22): Needs you, the requests for the member's copies that are theirs to answer, the
// requests for more time and the returns they confirm; You borrowed and You lent, overdue first;
// In line, the copies the member waits for, each opening its game's page, where Leave the line is;
// and You asked, their own requests waiting on an owner. The other rows open the loan's page.
// Record a loan (C9) sits beside the title and in the empty state, and Past loans (C12) at the
// end.
export default async function LoansPage() {
  await connection();
  const { user } = await gate("app");
  const { you, needsYou, borrowed, lent, inLine, youAsked } =
    await getInjection("IListLoansController")(user.id);
  const now = new Date();
  const today = todayIn(PLAN_TIME_ZONE, now);
  const empty =
    needsYou.length +
      borrowed.length +
      lent.length +
      inLine.length +
      youAsked.length ===
    0;

  return (
    <PageColumn
      width="read"
      header={
        <AppHeader
          title="Loans"
          action={
            <Button
              size="sm"
              variant="secondary"
              nativeButton={false}
              render={
                <Link href="/loans/record" transitionTypes={["go-deeper"]} />
              }
            >
              Record a loan
            </Button>
          }
        />
      }
    >
      {empty && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No loans</EmptyTitle>
            <EmptyDescription>
              Borrow a game from the Library, or record one you lent in person.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="secondary"
              nativeButton={false}
              render={
                <Link href="/loans/record" transitionTypes={["go-deeper"]} />
              }
            >
              Record a loan
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {needsYou.length > 0 && (
        <Group label={`Needs you · ${needsYou.length}`} overList>
          <List>
            {needsYou.map(({ loan, copy, game, other, next, why }) =>
              why === "more-time" ? (
                <ListRow
                  key={loan.id}
                  href={`/loans/${loan.id}`}
                  thumb={
                    <Piece
                      shape={other.pieceShape}
                      color={other.pieceColor}
                      size={20}
                    />
                  }
                  stamp={
                    <Stamp
                      tone={
                        copyState(copy, [loan], copy.userId, today).stamp.tone
                      }
                    >
                      {copyState(copy, [loan], copy.userId, today).stamp.word}
                    </Stamp>
                  }
                >
                  <RowName>{game.title}</RowName>
                  <span className="text-13">
                    {other.name} asked for more time
                  </span>
                  {next && <RowFacts>{`${next.name} is 1st in line`}</RowFacts>}
                </ListRow>
              ) : why === "return" ? (
                <ListRow
                  key={loan.id}
                  href={`/loans/${loan.id}`}
                  thumb={
                    <Piece
                      shape={other.pieceShape}
                      color={other.pieceColor}
                      size={20}
                    />
                  }
                  stamp={<Stamp tone="red">Given back</Stamp>}
                >
                  <RowName>
                    {other.name} gave back {game.title}
                  </RowName>
                  {loan.returnedOn && (
                    <RowFacts>On {formatDate(loan.returnedOn, today)}</RowFacts>
                  )}
                </ListRow>
              ) : (
                <ListRow
                  key={loan.id}
                  href={`/loans/${loan.id}`}
                  thumb={
                    <Piece
                      shape={other.pieceShape}
                      color={other.pieceColor}
                      size={20}
                    />
                  }
                  stamp={<Stamp tone="red">Requested</Stamp>}
                >
                  <RowName>
                    {other.name} asked for {game.title}
                  </RowName>
                  {loan.requestNote && (
                    <span className="text-13">“{loan.requestNote}”</span>
                  )}
                </ListRow>
              ),
            )}
          </List>
        </Group>
      )}

      {you && borrowed.length > 0 && (
        <Group label="You borrowed" overList>
          <ul className="flex flex-col gap-3">
            {borrowed.map((item) => (
              <LoanCard
                key={item.loan.id}
                item={item}
                side="borrowed"
                borrower={you}
                today={today}
              />
            ))}
          </ul>
        </Group>
      )}

      {lent.length > 0 && (
        <Group label="You lent" overList>
          <ul className="flex flex-col gap-3">
            {lent.map((item) => (
              <LoanCard
                key={item.loan.id}
                item={item}
                side="lent"
                borrower={item.other}
                today={today}
              />
            ))}
          </ul>
        </Group>
      )}

      {inLine.length > 0 && (
        <Group label="In line" overList>
          <List>
            {inLine.map(({ loan, game, other, place, holder }) => (
              <ListRow
                key={loan.id}
                href={`/games/${game.id}`}
                thumb={
                  <CoverThumb
                    color={coverColorOf(game)}
                    imageUrl={game.imageUrl}
                  />
                }
                stamp={
                  <Stamp tone="brown">{`${ordinal(place)} in line`}</Stamp>
                }
              >
                <RowName>{game.title}</RowName>
                <RowFacts>{other.name}’s copy</RowFacts>
                <RowFacts>
                  {holder?.status === "accepted" || !holder
                    ? `At ${other.name}’s`
                    : holder.dueOn
                      ? `Out until ${formatMonthDay(holder.dueOn)}`
                      : "Out"}
                </RowFacts>
              </ListRow>
            ))}
          </List>
        </Group>
      )}

      {youAsked.length > 0 && (
        <Group label="You asked" overList>
          <List>
            {youAsked.map(({ loan, game, other }) => (
              <ListRow
                key={loan.id}
                href={`/loans/${loan.id}`}
                thumb={
                  <CoverThumb
                    color={coverColorOf(game)}
                    imageUrl={game.imageUrl}
                  />
                }
                stamp={<Stamp tone="brown">You asked</Stamp>}
              >
                <RowName>{game.title}</RowName>
                <RowFacts>{other.name} hasn’t answered</RowFacts>
                <RowFacts>Asked {formatWhen(loan.createdAt, now)}</RowFacts>
              </ListRow>
            ))}
          </List>
        </Group>
      )}
      <List>
        <ListRow href="/loans/past">
          <RowName>Past loans</RowName>
        </ListRow>
      </List>
    </PageColumn>
  );
}
