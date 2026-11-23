import {
  Empty,
  EmptyContent,
  EmptyDescription,
} from "@repo/ui/components/empty";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { AppHeader } from "@/app/_components/app-header";
import { CopyRow, copyName } from "@/app/_components/copy-row";
import { copySummary, copyWords } from "@/app/_components/copy-state";
import { Cover } from "@/app/_components/cover";
import { Dice } from "@/app/_components/dice";
import { GameVideo } from "@/app/_components/game-video";
import { Group } from "@/app/_components/group";
import { IOwnIt } from "@/app/_components/i-own-it";
import { LeaveLine } from "@/app/_components/leave-line";
import { List, ListRow, RowFacts, RowName } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { gameCard } from "@/src/entities/game-card";
import { gameFacts, titleLine } from "@/src/entities/game-facts";
import { listed } from "@/src/entities/listed";
import type { CopyState } from "@/src/entities/loan";
import type { Loan } from "@/src/entities/models/loan.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { coverColorOf } from "@/src/entities/piece";
import { formatMonthDay, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { AskToBorrow, type CopyToAsk } from "./ask-to-borrow";
import { JoinLine } from "./join-line";

// A game's page (R14; B5, B11, B13; Wide2 in the 640 column): its cover with the member's own
// stamp, its facts, About, its expansions or base game, the how-to-play video, then every copy
// the member may see. Only what the game has shows (rule 14). Opened from a search, the way back
// keeps it (?q=).
export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const { q, from } = await searchParams;
  const search = typeof q === "string" && q.trim() !== "" ? q : null;
  // Opened from a search on My library, the way back returns there (rule 11).
  const back = from === "/my-library" ? "/my-library" : "/";
  const view = await loadGame(id, user.id);
  const now = new Date();
  const today = todayIn(PLAN_TIME_ZONE, now);
  const { game, baseGame, expansions, copies, people } = view;
  const keepSearch = search ? `?q=${encodeURIComponent(search)}` : "";

  const facts = gameFacts(game);
  const players = facts.find((fact) => fact.kind === "players");
  const others = facts.filter((fact) => fact.kind !== "players");
  const line = titleLine(game);
  const card = copies.length > 0 ? gameCard(copies, people, user.id) : null;
  // How many copies you could borrow now, counted only once a friend has one (B5; B11 is yours
  // alone and has no such line).
  const free = copies.filter(
    ({ copy, state }) =>
      copy.lendable && state.holder === null && state.promised === null,
  ).length;
  const available = copies.some(({ state }) => !state.yours)
    ? `${free} of ${copies.length} available`
    : null;
  const places = new Map<string, number>();
  // A friend's copy as C1 and C10 show it.
  const toAsk = (
    copy: UserGame,
    owner: NameAndPiece,
    boxedExpansions: readonly string[],
  ): CopyToAsk => ({
    userGameId: copy.id,
    title: game.title,
    color: coverColorOf(game),
    imageUrl: game.imageUrl,
    owner,
    summary: copySummary(copy, boxedExpansions, baseGame?.title ?? game.title),
  });
  // A friend's copy of the game that's available, for C10's "Borrow that instead".
  const insteadOf = (userGameId: string): CopyToAsk | null => {
    const other = copies.find(
      ({ copy, state }) =>
        copy.id !== userGameId && !state.yours && state.kind === "available",
    );
    const owner = other && people[other.copy.userId];
    return other && owner
      ? toAsk(other.copy, owner, other.boxedExpansions)
      : null;
  };

  return (
    <PageColumn
      width="read"
      header={
        <AppHeader back={{ href: `${back}${keepSearch}`, label: "Library" }} />
      }
    >
      <Cover
        title={game.title}
        color={coverColorOf(game)}
        imageUrl={game.imageUrl}
        stamp={
          card && (
            <Stamp tone={card.stamp.tone} size="card" tilt={6}>
              {card.stamp.word}
            </Stamp>
          )
        }
      />
      <div className="flex flex-col gap-0.75">
        <h1 className="text-2xl leading-7 font-bold">{game.title}</h1>
        {line && <p className="text-13 text-muted-foreground">{line}</p>}
        {available && (
          <p className="-mt-2 -mb-2.5 flex flex-wrap items-center gap-x-1.5 font-mono text-xs font-medium text-muted-foreground">
            {available}
            <span aria-hidden="true">·</span>
            <a
              href="#copies"
              className="flex min-h-11 items-center font-sans text-sm font-bold text-foreground hover:text-destructive"
            >
              <span className="border-b-2 border-dashed border-current pb-px">
                See copies
              </span>
            </a>
          </p>
        )}
      </div>

      {facts.length > 0 && (
        <Group label="The facts">
          {players && (
            <div className="flex items-center gap-3">
              <Dice
                min={game.minPlayers}
                max={game.maxPlayers}
                // One face is inked (the design system's Dice); the text names every best count.
                best={game.bestPlayers?.[0]}
              />
              <span className="font-mono text-xs font-medium">
                {players.text}
              </span>
            </div>
          )}
          {others.length > 0 && (
            <ul className="flex flex-wrap gap-x-4.5 gap-y-1 font-mono text-xs font-medium">
              {others.map((fact) => (
                <li key={fact.kind} className="whitespace-nowrap">
                  {fact.text}
                </li>
              ))}
            </ul>
          )}
        </Group>
      )}

      {(game.description || game.categories?.length) && (
        <Group label="About">
          {game.description && (
            <p className="text-sm leading-5 text-muted-foreground">
              {game.description}
            </p>
          )}
          {game.categories?.length ? (
            <p className="text-13 leading-4.75 text-muted-foreground">
              <span className="font-semibold text-foreground">Categories:</span>{" "}
              {game.categories.join(", ")}
            </p>
          ) : null}
        </Group>
      )}

      {expansions.length > 0 && (
        <Group label="Expansions" overList>
          <List>
            {expansions.map((expansion) => (
              <ListRow
                key={expansion.id}
                href={`/games/${expansion.id}${keepSearch}`}
              >
                <RowName>{expansion.title}</RowName>
                {expansion.year !== null && (
                  <RowFacts>{expansion.year}</RowFacts>
                )}
              </ListRow>
            ))}
          </List>
        </Group>
      )}

      {baseGame && (
        <Group label="Base game" overList>
          <List>
            <ListRow href={`/games/${baseGame.id}${keepSearch}`}>
              <RowName>{baseGame.title}</RowName>
              {baseGame.year !== null && <RowFacts>{baseGame.year}</RowFacts>}
            </ListRow>
          </List>
        </Group>
      )}

      {game.videoUrl && (
        <Group label="How to play">
          <GameVideo link={game.videoUrl} title={game.title} />
        </Group>
      )}

      <Group
        label={
          available
            ? `Copies · ${available}`
            : copies.length > 0
              ? `Copies · ${copies.length}`
              : "Copies"
        }
        overList
        id="copies"
      >
        {copies.length > 0 ? (
          <List>
            {copies.map(({ copy, state, boxedExpansions }) => {
              const owner = people[copy.userId];
              if (!owner) {
                return null;
              }
              const place = (places.get(copy.userId) ?? 0) + 1;
              places.set(copy.userId, place);
              const words = copyWords({
                copy,
                state,
                owner,
                people,
                boxedExpansions,
                baseTitle: baseGame?.title ?? game.title,
                today,
                now,
              });
              return (
                <CopyRow
                  key={copy.id}
                  name={copyName(state.yours ? null : owner.name, place)}
                  owner={owner}
                  lines={words.lines}
                  stamp={words.stamp}
                  href={copyHref(copy.id, state, user.id)}
                  action={copyAction({
                    copy: toAsk(copy, owner, boxedExpansions),
                    lendable: copy.lendable,
                    passAlong: copy.passAlong,
                    state,
                    people,
                    userId: user.id,
                    instead: insteadOf(copy.id),
                  })}
                />
              );
            })}
          </List>
        ) : (
          <Empty>
            <EmptyDescription>
              None of your friends own this yet.
            </EmptyDescription>
            {game.type === "base-game" && (
              <EmptyContent>
                <IOwnIt gameId={game.id} />
              </EmptyContent>
            )}
          </Empty>
        )}
        {game.type === "base-game" &&
          copies.length > 0 &&
          !copies.some(({ state }) => state.yours) && (
            <IOwnIt
              gameId={game.id}
              label="I own this too. Add it to my library"
              quiet
            />
          )}
      </Group>
    </PageColumn>
  );
}

// The button at the right of a friend's copy (B5, B13): Borrow while it's available (C1), Join the
// line while it's out, promised or asked for (C10), and Leave the line once the member is in it.
function copyAction({
  copy,
  lendable,
  passAlong,
  state,
  people,
  userId,
  instead,
}: {
  copy: CopyToAsk;
  lendable: boolean;
  passAlong: boolean;
  state: CopyState<Loan>;
  people: Record<string, NameAndPiece>;
  userId: string;
  instead: CopyToAsk | null;
}): ReactNode {
  if (state.yours) {
    return undefined;
  }
  if (state.kind === "available") {
    return <AskToBorrow copy={copy} />;
  }
  if (state.kind === "in-line") {
    const mine = state.line.find((loan) => loan.borrowerUserId === userId);
    return mine ? <LeaveLine loanId={mine.id} title={copy.title} /> : undefined;
  }
  if (
    !lendable ||
    (state.kind !== "out" &&
      state.kind !== "promised" &&
      state.kind !== "requested")
  ) {
    return undefined;
  }
  const nameOf = (loan: Loan | null) =>
    (loan && people[loan.borrowerUserId]?.name) ?? "A friend";
  const ahead = state.line.flatMap((loan) => {
    const person = people[loan.borrowerUserId];
    return person ? [person] : [];
  });
  const holder = state.holder ?? state.promised;
  const where =
    state.holder !== null
      ? `${nameOf(state.holder)} has it${state.holder.dueOn ? ` until ${formatMonthDay(state.holder.dueOn)}` : ""}`
      : state.promised !== null
        ? `${nameOf(state.promised)} is picking it up`
        : `${nameOf(state.line[0] ?? null)} asked for it`;
  const after = [
    holder &&
      `${nameOf(holder)}’s loan${holder.dueOn ? ` ends ${formatMonthDay(holder.dueOn)}` : ""}`,
    ahead.length > 0 &&
      `${listed(ahead.map((person) => `${person.name}’s`))} ${ahead.length > 1 ? "turns" : "turn"}`,
  ].filter((part) => typeof part === "string");
  return (
    <JoinLine
      copy={copy}
      where={where}
      ahead={ahead}
      turn={
        passAlong
          ? `When it’s your turn, it’s handed straight to you: ${copy.owner.name} lets friends pass it along.`
          : `When it’s your turn, ${copy.owner.name} is asked to lend it to you.`
      }
      earliest={
        after.length > 0 ? `Earliest: after ${after.join(", and ")}.` : null
      }
      instead={instead}
    />
  );
}

// Where a copy's row opens: the member's own copy's page, or the loan page of their request or of
// the yes waiting for their pick-up (screens.md: the copy "opens the request").
function copyHref(
  copyId: string,
  state: CopyState<Loan>,
  userId: string,
): string | undefined {
  if (state.yours) {
    return `/copies/${copyId}`;
  }
  const mine =
    state.kind === "you-asked"
      ? state.line.find((loan) => loan.borrowerUserId === userId)
      : state.kind === "to-pick-up"
        ? state.promised
        : null;
  return mine ? `/loans/${mine.id}` : undefined;
}

// Everything the page reads, through its controller: an id that isn't a game's is Not found.
async function loadGame(gameId: string, userId: string) {
  try {
    return await getInjection("IGetGameController")({ gameId }, userId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    throw err;
  }
}
