import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { List, ListRow, RowFacts, RowName } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { adminRead } from "@/app/(main)/admin/admin-reads";
import { getInjection } from "@/di/container";
import { formatDay } from "@/src/entities/week";

const STAMPS = {
  added: { word: "Added", tone: "navy" },
  "already-here": { word: "Already here", tone: "navy" },
  declined: { word: "Declined", tone: "brown" },
} as const;

// G7, Answered suggestions, newest first: an added or already-here one opens the game's record,
// a declined one its suggestion, which shows its reason.
export default async function AnsweredPage() {
  await connection();
  const { user } = await gate("app");
  const answered = await adminRead(() =>
    getInjection("IListAnsweredSuggestionsController")(user.id),
  );
  const now = new Date();

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/admin", label: "Admin" }} />}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl leading-7 font-bold">Answered suggestions</h1>
        <p className="font-mono text-xs font-medium text-muted-foreground">
          {answered.length} answered, newest first
        </p>
      </div>
      {answered.length > 0 && (
        <List>
          {answered.map(({ suggestion, by, game }) => {
            const stamp =
              suggestion.status === "waiting"
                ? null
                : STAMPS[suggestion.status];
            return (
              <ListRow
                key={suggestion.id}
                href={
                  game
                    ? `/admin/games/${game.id}`
                    : `/admin/suggestions/${suggestion.id}`
                }
                stamp={stamp && <Stamp tone={stamp.tone}>{stamp.word}</Stamp>}
              >
                <RowName>{suggestion.title}</RowName>
                <RowFacts>
                  {by?.name ?? "Someone"} ·{" "}
                  {formatDay(
                    suggestion.answeredAt ?? suggestion.createdAt,
                    now,
                  )}
                </RowFacts>
                {suggestion.status === "already-here" && game && (
                  <span className="text-xs text-muted-foreground">
                    Already in the catalog as {game.title}
                    {game.year !== null && ` (${game.year})`}.
                  </span>
                )}
                {suggestion.declineNote && (
                  <span className="text-xs text-muted-foreground">
                    {suggestion.declineNote}
                  </span>
                )}
              </ListRow>
            );
          })}
        </List>
      )}
    </PageColumn>
  );
}
