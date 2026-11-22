import { CoverThumb } from "@/app/_components/cover-thumb";
import { Group } from "@/app/_components/group";
import { List, ListItem, ListRow, RowName } from "@/app/_components/list-row";
import { LoanTrack } from "@/app/_components/loan-track";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import type { DI_RETURN_TYPES } from "@/di/types";
import { copyState, ordinal } from "@/src/entities/loan";
import { coverColorOf } from "@/src/entities/piece";
import { formatDate, formatWhen } from "@/src/entities/week";
import { GiveBackForm } from "./give-back-form";
import { IsItBack } from "./is-it-back";
import { asSentence, datesLine, PhoneLink, Summary, Title } from "./loan-parts";

type LoanView = Awaited<ReturnType<DI_RETURN_TYPES["IGetLoanController"]>>;

// The people in the copy's line, each with their place: the borrower's due date doesn't change
// (C5), and the owner answers them in turn (C7, which U15 gives Remove from line).
function LineList({
  line,
  note,
  now,
}: {
  line: LoanView["line"];
  note?: string;
  now: Date;
}) {
  return (
    <List>
      {line.map((person, index) => (
        <ListItem key={person.loanId}>
          <Piece
            shape={person.pieceShape}
            color={person.pieceColor}
            size={20}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <RowName>{person.name}</RowName>
            <span className="text-xs text-muted-foreground">
              {note ??
                `${ordinal(index + 1)} in line · asked ${formatWhen(person.askedAt, now)}`}
            </span>
          </span>
          {note && <Stamp tone="navy">{`${ordinal(index + 1)} in line`}</Stamp>}
        </ListItem>
      ))}
    </List>
  );
}

// C5, the loan the member borrowed, while they have it or wait for the owner to confirm it's
// back: the stamp, the track with their piece on today, the dates and the owner's note on the copy;
// who's involved; and I gave it back. Passing it along and more time come with U14 and U15.
export function BorrowedLoan({
  view,
  today,
  now,
}: {
  view: LoanView;
  today: string;
  now: Date;
}) {
  const { loan, game, copy, other: owner, you, line } = view;
  const { stamp } = copyState(copy, [loan], loan.borrowerUserId, today);
  const returning = loan.status === "returning";
  return (
    <>
      <Title>{game.title}</Title>
      <Group
        label="The loan"
        aside={<Stamp tone={stamp.tone}>{stamp.word}</Stamp>}
      >
        <Summary
          thumb={
            <CoverThumb color={coverColorOf(game)} imageUrl={game.imageUrl} />
          }
          piece={
            <Piece shape={you.pieceShape} color={you.pieceColor} size={20} />
          }
          lead={
            returning
              ? `Waiting for ${owner.name} to confirm`
              : `You have it · from ${owner.name}`
          }
          facts={
            returning && loan.returnedOn
              ? [`You gave it back ${formatDate(loan.returnedOn, today)}`]
              : []
          }
        />
        {!returning && loan.pickedUpOn && loan.dueOn && (
          <LoanTrack
            pickedUpOn={loan.pickedUpOn}
            dueOn={loan.dueOn}
            today={today}
            borrower={you}
          />
        )}
        <p className="font-mono text-2xs font-medium text-muted-foreground">
          {datesLine(loan, today)}
        </p>
        {copy.conditionNote && (
          <p data-ink="smudge" className="text-xs">
            {owner.name}’s note on this copy: {asSentence(copy.conditionNote)}
          </p>
        )}
      </Group>
      <Group label="Who’s involved" overList>
        <List>
          <ListItem>
            <Piece
              shape={owner.pieceShape}
              color={owner.pieceColor}
              size={20}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <RowName>{owner.name}</RowName>
              <span className="text-xs text-muted-foreground">
                It’s {owner.name}’s copy
              </span>
            </span>
            {owner.phone && <PhoneLink name={owner.name} phone={owner.phone} />}
          </ListItem>
        </List>
        {line.length > 0 && (
          <LineList
            line={line}
            note="Your due date doesn’t change."
            now={now}
          />
        )}
      </Group>
      {!returning && loan.pickedUpOn && (
        <Group label="What you can do">
          <GiveBackForm
            loanId={loan.id}
            pickedUpOn={loan.pickedUpOn}
            owner={owner.name}
            today={today}
          />
        </Group>
      )}
    </>
  );
}

// C7, the member's copy someone has: who has it, the track with their piece, and the dates; It's
// back with me; the line; and the copy's history. While they wait for the owner to confirm it's
// back, the page leads with it (C8). More time, calling it back and passing along come with U14 and
// U15.
export function LentLoan({
  view,
  today,
  now,
}: {
  view: LoanView;
  today: string;
  now: Date;
}) {
  const { loan, game, copy, other: borrower, line, copyState: state } = view;
  const returning = loan.status === "returning";
  const isItBack = (gaveOn: string | null) =>
    loan.pickedUpOn && (
      <IsItBack
        loanId={loan.id}
        title={game.title}
        color={coverColorOf(game)}
        imageUrl={game.imageUrl}
        borrower={borrower}
        pickedUpOn={loan.pickedUpOn}
        gaveOn={gaveOn}
        conditionNote={copy.conditionNote}
        nextName={line[0]?.name ?? null}
        today={today}
      />
    );
  return (
    <>
      <Title>{game.title}</Title>
      {returning && loan.returnedOn && (
        <Group label="Is it back?">
          <span className="flex items-center gap-2.5 text-15">
            <Piece
              shape={borrower.pieceShape}
              color={borrower.pieceColor}
              size={20}
            />
            {borrower.name} says they gave it back{" "}
            {formatDate(loan.returnedOn, today)}.
          </span>
          {isItBack(loan.returnedOn)}
        </Group>
      )}
      <Group
        label="The loan"
        aside={<Stamp tone={state.stamp.tone}>{state.stamp.word}</Stamp>}
      >
        <div className="flex items-center gap-3">
          <CoverThumb color={coverColorOf(game)} imageUrl={game.imageUrl} />
          <Piece
            shape={borrower.pieceShape}
            color={borrower.pieceColor}
            size={20}
          />
          <span className="min-w-0 flex-1 text-15 font-bold">
            {borrower.name} has it
          </span>
          {borrower.phone && (
            <PhoneLink name={borrower.name} phone={borrower.phone} />
          )}
        </div>
        {!returning && loan.pickedUpOn && loan.dueOn && (
          <LoanTrack
            pickedUpOn={loan.pickedUpOn}
            dueOn={loan.dueOn}
            today={today}
            borrower={borrower}
          />
        )}
        <p className="font-mono text-2xs font-medium text-muted-foreground">
          {datesLine(loan, today)}
        </p>
      </Group>
      {!returning && <Group label="What you can do">{isItBack(null)}</Group>}
      {line.length > 0 && (
        <Group label="The line" overList>
          <LineList line={line} now={now} />
        </Group>
      )}
      <Group label="Your copy" overList>
        <List>
          <ListRow href={`/copies/${copy.id}`}>
            <RowName>This copy’s history</RowName>
          </ListRow>
        </List>
      </Group>
    </>
  );
}
