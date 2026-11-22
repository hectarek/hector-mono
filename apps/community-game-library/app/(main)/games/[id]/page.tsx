import {
  Empty,
  EmptyContent,
  EmptyDescription,
} from "@repo/ui/components/empty";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { CopyRow, copyName } from "@/app/_components/copy-row";
import { copyWords } from "@/app/_components/copy-state";
import { Cover } from "@/app/_components/cover";
import { Dice } from "@/app/_components/dice";
import { GameVideo } from "@/app/_components/game-video";
import { Group } from "@/app/_components/group";
import { IOwnIt } from "@/app/_components/i-own-it";
import { List, ListRow, RowFacts, RowName } from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { gameCard } from "@/src/entities/game-card";
import { gameFacts, titleLine } from "@/src/entities/game-facts";
import { coverColorOf } from "@/src/entities/piece";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

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
                  href={state.yours ? `/copies/${copy.id}` : undefined}
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
