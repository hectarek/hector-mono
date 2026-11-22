import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Group } from "@/app/_components/group";
import { IOwnIt } from "@/app/_components/i-own-it";
import {
  List,
  ListItem,
  ListRow,
  RowFacts,
  RowName,
} from "@/app/_components/list-row";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { SavedSwitch } from "@/app/_components/saved-switch";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { CopyForm } from "@/app/(main)/copies/[id]/copy-form";
import { RemoveCopy } from "@/app/(main)/copies/[id]/remove-copy";
import { setLending } from "@/app/actions/copies";
import { getInjection } from "@/di/container";
import {
  InputParseError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import type { CopyStamp } from "@/src/entities/loan";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { coverColorOf } from "@/src/entities/piece";
import {
  formatDate,
  formatMonthDay,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";

// One of my copies (B7, R8, R9): where it is, This copy with Save, its two lending switches, its
// loan history, the day it was added, a second copy, and Remove (B14). Only its owner opens it.
export default async function CopyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const view = await loadCopy(id, user.id);
  const today = todayIn(PLAN_TIME_ZONE);
  const { copy, game, expansions, boxed, state, history, people } = view;
  const addedOn = todayIn(PLAN_TIME_ZONE, copy.createdAt);

  // Where it is, in B7's words: who has it and until when, then the next in line, each beside
  // their piece; a copy at home says so.
  const whereLines: { text: string; person?: NameAndPiece }[] = [];
  const personOf = (userId: string | undefined) =>
    userId === undefined ? undefined : people[userId];
  const [first] = state.line;
  const holder = personOf(state.holder?.borrowerUserId);
  if (state.holder && holder) {
    whereLines.push({
      text: state.holder.dueOn
        ? `${holder.name} has it · due ${formatDate(state.holder.dueOn, today)}`
        : `${holder.name} has it`,
      person: holder,
    });
  } else if (state.kind === "not-lent") {
    whereLines.push({ text: "You keep it at home" });
  } else {
    whereLines.push({ text: "At home" });
  }
  const promised = personOf(state.promised?.borrowerUserId);
  if (promised) {
    whereLines.push({
      text: `You said yes to ${promised.name}`,
      person: promised,
    });
  }
  const next = personOf(first?.borrowerUserId);
  if (next) {
    whereLines.push({
      text:
        state.kind === "requested"
          ? `${next.name} asked for it`
          : `${next.name} is 1st in line`,
      person: next,
    });
  }
  const stamp: CopyStamp | null =
    state.kind === "available" ? null : state.stamp;

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/my-library", label: "My library" }} />}
    >
      <h1 className="text-2xl leading-7 font-bold">
        Your copy of {game.title}
      </h1>
      <List>
        <ListRow
          href={`/games/${game.id}`}
          thumb={
            <CoverThumb color={coverColorOf(game)} imageUrl={game.imageUrl} />
          }
        >
          <RowName>{game.title}</RowName>
          <RowFacts>Game details</RowFacts>
        </ListRow>
      </List>

      <Group label="Where it is">
        {whereLines.map((line, index) => (
          <div
            key={line.text}
            className="flex items-center justify-between gap-2"
          >
            <p className="flex items-center gap-2 text-sm">
              {line.person && (
                <Piece
                  shape={line.person.pieceShape}
                  color={line.person.pieceColor}
                  size={16}
                />
              )}
              {line.text}
            </p>
            {index === 0 && stamp && (
              <Stamp tone={stamp.tone}>{stamp.word}</Stamp>
            )}
          </div>
        ))}
      </Group>

      <CopyForm
        userGameId={copy.id}
        condition={copy.condition}
        conditionNote={copy.conditionNote ?? ""}
        expansions={expansions.map(({ id, title }) => ({ id, title }))}
        boxed={boxed}
      />

      <Group label="Lending">
        <div className="flex flex-col gap-1">
          <SavedSwitch
            label="I lend this copy"
            on={copy.lendable}
            save={setLending.bind(null, copy.id, "lendable")}
          />
          <SavedSwitch
            label="Friends can pass it along"
            help="On: a borrower hands it to the next friend in line. Off: it comes back to you between loans."
            on={copy.passAlong}
            save={setLending.bind(null, copy.id, "pass-along")}
          />
        </div>
      </Group>

      {history.length > 0 && (
        <Group label="Loan history" overList>
          <List>
            {history.map((loan) => {
              const borrower = people[loan.borrowerUserId];
              if (!borrower || !loan.pickedUpOn) {
                return null;
              }
              const until = loan.returnedOn
                ? formatMonthDay(loan.returnedOn)
                : "now";
              return (
                <ListItem key={loan.id}>
                  <Piece
                    shape={borrower.pieceShape}
                    color={borrower.pieceColor}
                    size={20}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <RowName>{borrower.name}</RowName>
                    <RowFacts>
                      {formatMonthDay(loan.pickedUpOn)} to {until}
                    </RowFacts>
                  </span>
                  {state.holder?.id === loan.id && (
                    <Stamp tone={state.stamp.tone}>{state.stamp.word}</Stamp>
                  )}
                </ListItem>
              );
            })}
          </List>
        </Group>
      )}

      <p className="font-mono text-xs font-medium text-muted-foreground">
        Added {formatMonthDay(addedOn)}, {addedOn.slice(0, 4)}
      </p>
      <IOwnIt gameId={game.id} label="I have a second copy of this" quiet />

      <Group label="Remove">
        <RemoveCopy
          userGameId={copy.id}
          gameId={game.id}
          title={game.title}
          out={state.holder !== null}
        />
      </Group>
    </PageColumn>
  );
}

// Everything the page reads, through its controller: an id that isn't a copy's, or someone
// else's copy, is Not found (only its owner manages a copy, R8).
async function loadCopy(userGameId: string, userId: string) {
  try {
    return await getInjection("IGetUserGameController")({ userGameId }, userId);
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof InputParseError ||
      err instanceof UnauthorizedError
    ) {
      notFound();
    }
    throw err;
  }
}
