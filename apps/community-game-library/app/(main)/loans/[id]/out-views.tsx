import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Group } from "@/app/_components/group";
import { ForwardIcon } from "@/app/_components/icons";
import { List, ListItem, RowName } from "@/app/_components/list-row";
import { LoanTrack } from "@/app/_components/loan-track";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import type { DI_RETURN_TYPES } from "@/di/types";
import {
  copyState,
  isOverdue,
  moreTimeFrom,
  ordinal,
} from "@/src/entities/loan";
import { coverColorOf } from "@/src/entities/piece";
import { daysBetween, formatDate, formatWhen } from "@/src/entities/week";
import { CallBackButton } from "./call-back-button";
import { ChangeDueSheet } from "./change-due-sheet";
import { GiveBackForm } from "./give-back-form";
import { IsItBack } from "./is-it-back";
import { asSentence, datesLine, PhoneLink, Summary, Title } from "./loan-parts";
import { MoreTimeAnswer } from "./more-time-answer";
import { MoreTimeSheet } from "./more-time-sheet";
import { TakeItBack } from "./pass-along-moves";
import { RemoveFromLine } from "./remove-from-line";

type LoanView = Awaited<ReturnType<DI_RETURN_TYPES["IGetLoanController"]>>;

// The people in the copy's line, each with their place: the borrower's due date doesn't change
// (C5), and the owner answers them in turn, or takes them out of the line (C7).
function LineList({
  line,
  note,
  now,
  removable = false,
}: {
  line: LoanView["line"];
  note?: string;
  now: Date;
  removable?: boolean;
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
          {removable && (
            <RemoveFromLine loanId={person.loanId} name={person.name} />
          )}
        </ListItem>
      ))}
    </List>
  );
}

// What a request for more time asks for, in C5's words: "1 more week", "3 more days", or "more
// time, until Fri, Nov 20".
function moreTimeWords(dueOn: string, askedFor: string, today: string): string {
  const days = daysBetween(dueOn, askedFor);
  return days === 7
    ? "1 more week"
    : days === 3
      ? "3 more days"
      : `more time, until ${formatDate(askedFor, today)}`;
}

// "Jo’s week starts", "Jo’s two weeks start": the next loan's period, which a pass-along copies
// (C5, R48).
function periodStarts(name: string, days: number | null): string {
  const noun =
    days === 7
      ? "week"
      : days === 14
        ? "two weeks"
        : days === 30
          ? "month"
          : days === null
            ? "loan"
            : `${days} days`;
  const one = days === 7 || days === 30 || days === null;
  return `${name}’s ${noun} ${one ? "starts" : "start"}`;
}

// C5, the loan the member borrowed, while they have it, hand it on, or wait for the owner to
// confirm it's back: the stamp, the track with their piece on today, the dates and the owner's
// note on the copy; who's involved; and what they can do: hand it straight to the next friend
// when the owner lets friends pass it along (C11), give it back, or ask for more time (U14). It
// leads with "Sam wants it back now" once it's called back, and with the request while one waits
// for an answer. Handed on, it reads "Waiting for Jo to confirm", with I still have it (R48).
export function BorrowedLoan({
  view,
  today,
  now,
}: {
  view: LoanView;
  today: string;
  now: Date;
}) {
  const { loan, game, copy, other: owner, you, line, handoff } = view;
  const { stamp } = copyState(copy, [loan], loan.borrowerUserId, today);
  const out = loan.status === "out";
  const returning = loan.status === "returning";
  const passing = loan.status === "passing";
  const next = line[0] ?? null;
  return (
    <>
      <Title>{game.title}</Title>
      {out && loan.calledBackAt && (
        <Group label={`${owner.name} wants it back now`}>
          <p className="text-15">
            {owner.name} called it back {formatWhen(loan.calledBackAt, now)}.
            {loan.dueOn &&
              (loan.dueOn === today
                ? " It’s due today."
                : ` It was due ${formatDate(loan.dueOn, today)}.`)}
          </p>
        </Group>
      )}
      {out && loan.moreTimeDueOn && loan.dueOn && (
        <Group label="Your request">
          <Summary
            thumb={null}
            lead={`You asked for ${moreTimeWords(loan.dueOn, loan.moreTimeDueOn, today)}`}
            facts={[`${owner.name} hasn’t answered`]}
          />
        </Group>
      )}
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
              : passing && handoff
                ? `Waiting for ${handoff.name} to confirm`
                : `You have it · from ${owner.name}`
          }
          facts={
            returning && loan.returnedOn
              ? [`You gave it back ${formatDate(loan.returnedOn, today)}`]
              : passing && handoff
                ? [`You gave it to ${handoff.name}`]
                : []
          }
        />
        {out && loan.pickedUpOn && loan.dueOn && (
          <LoanTrack
            pickedUpOn={loan.pickedUpOn}
            dueOn={loan.dueOn}
            today={today}
            borrower={you}
            moves
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
          {passing && handoff && (
            <ListItem>
              <Piece
                shape={handoff.pieceShape}
                color={handoff.pieceColor}
                size={20}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <RowName>{handoff.name}</RowName>
                <span className="text-xs text-muted-foreground">
                  Getting it from you
                </span>
              </span>
              {handoff.phone && (
                <PhoneLink name={handoff.name} phone={handoff.phone} />
              )}
            </ListItem>
          )}
        </List>
        {line.length > 0 && (
          <LineList
            line={line}
            note={out ? "Your due date doesn’t change." : undefined}
            now={now}
          />
        )}
      </Group>
      {out && loan.pickedUpOn && (
        <Group label="What you can do">
          {handoff && (
            <>
              <p className="text-13 leading-snug text-muted-foreground">
                Pass-along is on: when you’re done, hand it straight to{" "}
                {handoff.name}. {owner.name} is told who has it, and{" "}
                {periodStarts(handoff.name, loan.periodDays)} when they confirm.
              </p>
              <Button
                size="lg"
                nativeButton={false}
                render={
                  <Link
                    href={`/loans/${loan.id}/pass-along`}
                    transitionTypes={["go-deeper"]}
                  />
                }
              >
                Hand it to {handoff.name}
              </Button>
            </>
          )}
          {!handoff && next && !copy.passAlong && !loan.calledBackAt && (
            <p className="text-13 leading-snug text-muted-foreground">
              Pass-along is off: when you’re done, give it back to {owner.name},
              who answers {next.name} next.
            </p>
          )}
          <div
            className={
              handoff
                ? "mt-0.5 border-t-2 border-dashed border-foreground pt-2.5"
                : undefined
            }
          >
            <GiveBackForm
              loanId={loan.id}
              pickedUpOn={loan.pickedUpOn}
              owner={owner.name}
              today={today}
            />
          </div>
          {loan.dueOn && !loan.calledBackAt && !loan.moreTimeAskedAt && (
            <MoreTimeSheet
              loanId={loan.id}
              title={game.title}
              color={coverColorOf(game)}
              imageUrl={game.imageUrl}
              dueOn={loan.dueOn}
              from={moreTimeFrom(loan.dueOn, today)}
              owner={owner.name}
              nextName={next?.name ?? null}
              today={today}
            />
          )}
        </Group>
      )}
      {passing && handoff && (
        <Group label="What you can do">
          <p className="text-13 leading-snug text-muted-foreground">
            {handoff.name} is asked to confirm. The loan stays yours until{" "}
            {handoff.name} does, and then {owner.name} is told.
          </p>
          <TakeItBack loanId={loan.id} next={handoff.name} />
        </Group>
      )}
    </>
  );
}

// C7, the member's copy someone has: who has it, the track with their piece, and the dates; It's
// back with me and Change the due date (C14), which C18 drops once it's called back; the line,
// with Remove from line; the copy's
// pass-along switch in words, and its history; and Call it back (C15), which C18 then marks. It
// leads with the borrower's request for more time (C13) while one waits, and with Is it back? (C8)
// while they say they gave it back. Handed on, it reads "Robin is handing it to Jo" (R48).
export function LentLoan({
  view,
  today,
  now,
}: {
  view: LoanView;
  today: string;
  now: Date;
}) {
  const {
    loan,
    game,
    copy,
    other: borrower,
    line,
    copyState: state,
    handoff,
  } = view;
  const out = loan.status === "out";
  const returning = loan.status === "returning";
  const passing = loan.status === "passing";
  const next = line[0] ?? null;
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
        nextName={next?.name ?? null}
        today={today}
      />
    );
  return (
    <>
      <Title>{game.title}</Title>
      {out && loan.moreTimeDueOn && loan.pickedUpOn && loan.dueOn && (
        <Group label={`${borrower.name} asked for more time`}>
          <div className="flex items-start gap-2.5">
            <Piece
              shape={borrower.pieceShape}
              color={borrower.pieceColor}
              size={20}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-15 font-bold">
                Until {formatDate(loan.moreTimeDueOn, today)}
              </span>
              {loan.moreTimeNote && (
                <span className="text-sm">“{loan.moreTimeNote}”</span>
              )}
            </div>
          </div>
          <MoreTimeAnswer
            loanId={loan.id}
            title={game.title}
            color={coverColorOf(game)}
            imageUrl={game.imageUrl}
            borrower={borrower}
            pickedUpOn={loan.pickedUpOn}
            dueOn={loan.dueOn}
            askedFor={loan.moreTimeDueOn}
            askedNote={loan.moreTimeNote}
            nextName={next?.name ?? null}
            today={today}
          />
        </Group>
      )}
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
            {passing && handoff
              ? `${borrower.name} is handing it to ${handoff.name}`
              : `${borrower.name} has it`}
          </span>
          {borrower.phone && (
            <PhoneLink name={borrower.name} phone={borrower.phone} />
          )}
        </div>
        {out && loan.pickedUpOn && loan.dueOn && (
          <LoanTrack
            pickedUpOn={loan.pickedUpOn}
            dueOn={loan.dueOn}
            today={today}
            borrower={borrower}
            moves
          />
        )}
        <p className="font-mono text-2xs font-medium text-muted-foreground">
          {passing && handoff
            ? `Waiting for ${handoff.name} to confirm`
            : datesLine(loan, today)}
          {/* A line of its own, as C18 draws it, so no "·" is stranded where the dates wrap. */}
          {loan.calledBackAt && (
            <>
              <br />
              Called back {formatWhen(loan.calledBackAt, now)}
            </>
          )}
        </p>
      </Group>
      {out && (
        <Group label="What you can do">
          {isItBack(null)}
          {loan.dueOn && !loan.calledBackAt && (
            <ChangeDueSheet
              loanId={loan.id}
              title={game.title}
              color={coverColorOf(game)}
              imageUrl={game.imageUrl}
              dueOn={loan.dueOn}
              from={moreTimeFrom(loan.dueOn, today)}
              borrower={borrower}
              nextName={next?.name ?? null}
              today={today}
            />
          )}
        </Group>
      )}
      {line.length > 0 && (
        <Group label="The line" overList>
          <LineList line={line} now={now} removable />
        </Group>
      )}
      <Group label="Your copy">
        {next && out && (
          <>
            <p className="text-sm">
              {copy.passAlong
                ? `Pass-along is on: ${borrower.name} hands it straight to ${next.name}, and you’re told who has it.`
                : `Pass-along is off: ${borrower.name} returns it to you, then you answer ${next.name}.`}
            </p>
            <Link
              href={`/copies/${copy.id}`}
              transitionTypes={["go-deeper"]}
              className="self-start text-sm font-bold underline underline-offset-2"
            >
              Change it on this copy’s page
            </Link>
          </>
        )}
        <Link
          href={`/copies/${copy.id}`}
          transitionTypes={["go-deeper"]}
          className="flex min-h-11 items-center justify-between gap-2 text-15 font-bold hover:text-destructive"
        >
          This copy’s history
          <ForwardIcon />
        </Link>
      </Group>
      {!returning &&
        (loan.calledBackAt ? (
          <p className="rounded-lg border-2 border-foreground bg-card px-3.5 py-3 text-sm">
            You called it back {formatWhen(loan.calledBackAt, now)}.{" "}
            {borrower.name} sees that when they next open the app.
          </p>
        ) : (
          <Group label="Need it back now?">
            <CallBackButton
              loanId={loan.id}
              title={game.title}
              borrower={borrower.name}
              overdue={isOverdue(loan, today)}
              nextName={next?.name ?? null}
            />
          </Group>
        ))}
    </>
  );
}
