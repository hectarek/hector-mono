import { Empty, EmptyHeader, EmptyTitle } from "@repo/ui/components/empty";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { Group } from "@/app/_components/group";
import { List, ListRow, RowFacts, RowName } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { adminRead } from "@/app/(main)/admin/admin-reads";
import { getInjection } from "@/di/container";
import { formatDay } from "@/src/entities/week";

// G1, Admin (R4, R5, R41): the suggestions waiting, oldest first, then the catalog's tasks, then
// Accounts. Anyone but the admin gets Not found.
export default async function AdminPage() {
  await connection();
  const { user } = await gate("app");
  const [waiting, answered] = await loadLists(user.id);
  const now = new Date();

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/you", label: "You" }} />}
    >
      <h1 className="text-2xl leading-7 font-bold">Admin</h1>
      <Group
        label={
          waiting.length > 0
            ? `Suggestions · ${waiting.length} new`
            : "Suggestions"
        }
        overList
      >
        {waiting.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No suggestions waiting.</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
        <List>
          {waiting.map(({ suggestion, by }) => (
            <ListRow
              key={suggestion.id}
              href={`/admin/suggestions/${suggestion.id}`}
              thumb={
                by && (
                  <Piece
                    shape={by.pieceShape}
                    color={by.pieceColor}
                    size={20}
                  />
                )
              }
              stamp={<Stamp tone="red">New</Stamp>}
            >
              <RowName>{suggestion.title}</RowName>
              <RowFacts>
                {by?.name ?? "Someone"} · {formatDay(suggestion.createdAt, now)}
              </RowFacts>
            </ListRow>
          ))}
          <ListRow href="/admin/suggestions/answered" count={answered.length}>
            <RowName>Answered suggestions</RowName>
          </ListRow>
        </List>
      </Group>
      <Group label="Catalog" overList>
        <List>
          <ListRow href="/admin/games">
            <RowName>Find a game to edit</RowName>
          </ListRow>
          <ListRow href="/admin/games/new">
            <RowName>Add a game by hand</RowName>
          </ListRow>
        </List>
      </Group>
      <Group label="Accounts" overList>
        <List>
          <ListRow href="/admin/accounts">
            <RowName>Remove an account</RowName>
          </ListRow>
        </List>
      </Group>
    </PageColumn>
  );
}

// Both lists, through their controllers, one after the other (KTD2): anyone but the admin is Not
// found.
async function loadLists(userId: string) {
  const waiting = await adminRead(() =>
    getInjection("IListSuggestionsController")(userId),
  );
  const answered = await adminRead(() =>
    getInjection("IListAnsweredSuggestionsController")(userId),
  );
  return [waiting, answered] as const;
}
