import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Group } from "@/app/_components/group";
import {
  List,
  ListRow,
  RowFacts,
  RowLine,
  RowName,
} from "@/app/_components/list-row";
import { LoanTrack } from "@/app/_components/loan-track";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import type { DI_RETURN_TYPES } from "@/di/types";
import { copyState } from "@/src/entities/loan";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { coverColorOf } from "@/src/entities/piece";
import {
  formatDate,
  formatWhen,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";

type Item = Awaited<
  ReturnType<DI_RETURN_TYPES["IListLoansController"]>
>["borrowed"][number];

// A person beside their piece, in a row's 12px line ("From Sam", "Jo is 1st in line").
function PersonLine({
  person,
  children,
}: {
  person: NameAndPiece;
  children: string;
}) {
  return (
    <RowLine>
      <Piece shape={person.pieceShape} color={person.pieceColor} size={11} />
      {children}
    </RowLine>
  );
}

// A loan that's out, or said yes to, on Loans (C4): its game, its stamp, the track with the
// borrower's piece while it's out, then who it's from or with, and who's next in line.
function LoanItemRow({
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
    <ListRow
      href={`/loans/${loan.id}`}
      stamp={<Stamp tone={stamp.tone}>{stamp.word}</Stamp>}
    >
      <RowName>{game.title}</RowName>
      {loan.status === "out" && loan.pickedUpOn && loan.dueOn && (
        <LoanTrack
          pickedUpOn={loan.pickedUpOn}
          dueOn={loan.dueOn}
          today={today}
          borrower={borrower}
        />
      )}
      <PersonLine person={other}>
        {side === "borrowed"
          ? `From ${other.name}`
          : loan.status === "accepted"
            ? `${other.name} hasn’t picked it up yet`
            : `${other.name} has it`}
      </PersonLine>
      {next && (
        <PersonLine person={next}>{`${next.name} is 1st in line`}</PersonLine>
      )}
    </ListRow>
  );
}

// Loans (C4, R22): Needs you, the requests for the member's copies that are theirs to answer, the
// requests for more time (U14) and the returns they confirm; You borrowed and You lent, overdue first; and You asked, their own
// requests waiting on an owner. Each row opens the loan's page. The lines, more time, Record a loan
// and Past loans come with U14 to U16.
export default async function LoansPage() {
  await connection();
  const { user } = await gate("app");
  const { you, needsYou, borrowed, lent, youAsked } = await getInjection(
    "IListLoansController",
  )(user.id);
  const now = new Date();
  const today = todayIn(PLAN_TIME_ZONE, now);
  const empty =
    needsYou.length + borrowed.length + lent.length + youAsked.length === 0;

  return (
    <PageColumn width="read" header={<AppHeader title="Loans" />}>
      {empty && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No loans</EmptyTitle>
            <EmptyDescription>
              Borrow a game from the Library, or record one you lent in person.
            </EmptyDescription>
          </EmptyHeader>
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
          <List>
            {borrowed.map((item) => (
              <LoanItemRow
                key={item.loan.id}
                item={item}
                side="borrowed"
                borrower={you}
                today={today}
              />
            ))}
          </List>
        </Group>
      )}

      {lent.length > 0 && (
        <Group label="You lent" overList>
          <List>
            {lent.map((item) => (
              <LoanItemRow
                key={item.loan.id}
                item={item}
                side="lent"
                borrower={item.other}
                today={today}
              />
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
    </PageColumn>
  );
}
