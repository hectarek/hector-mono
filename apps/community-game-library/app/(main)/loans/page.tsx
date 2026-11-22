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
import { List, ListRow, RowFacts, RowName } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { coverColorOf } from "@/src/entities/piece";
import { formatWhen } from "@/src/entities/week";

// Loans (C4), as far as U12 builds it: Needs you, the requests for the member's copies that are
// theirs to answer, and You asked, their own requests waiting on an owner, each opening the loan's
// page. The loans out, the lines, more time, Record a loan and Past loans come with U13 to U16.
export default async function LoansPage() {
  await connection();
  const { user } = await gate("app");
  const { needsYou, youAsked } = await getInjection("IListLoansController")(
    user.id,
  );
  const now = new Date();

  return (
    <PageColumn width="read" header={<AppHeader title="Loans" />}>
      {needsYou.length === 0 && youAsked.length === 0 && (
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
            {needsYou.map(({ loan, game, other }) => (
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
