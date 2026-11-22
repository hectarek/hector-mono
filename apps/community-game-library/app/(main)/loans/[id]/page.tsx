import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { AppHeader } from "@/app/_components/app-header";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Group } from "@/app/_components/group";
import { PageColumn } from "@/app/_components/page-column";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { ordinal } from "@/src/entities/loan";
import type { Loan } from "@/src/entities/models/loan.model";
import { coverColorOf } from "@/src/entities/piece";
import {
  formatDate,
  formatWhen,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";
import { AnswerForm } from "./answer-form";
import { LoanMoveButton } from "./loan-move-button";
import {
  Asker,
  askedWhen,
  capitalized,
  datesLine,
  Person,
  periodWords,
  Summary,
  Title,
} from "./loan-parts";
import { BorrowedLoan, LentLoan } from "./out-views";
import { OwnerPickUp } from "./owner-pick-up";
import { PickUpForm } from "./pick-up-form";

// A loan's page, for its copy's owner and its borrower only (D14: the one place its buttons live),
// one board by the loan's status and the member's role: C16 to the borrower and C2 to the owner
// while it's a request (U12); after a yes, C17 to the owner, with Priya has it, and C3 to the
// borrower, with When you have it (U13); while it's out or coming back, C5 to the borrower and C7
// to the owner, with Is it back? (C8) once the borrower says they gave it back (U13).
export default async function LoanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const view = await loadLoan(id, user.id);
  const { loan, role, game, other, copyState } = view;
  const now = new Date();
  const today = todayIn(PLAN_TIME_ZONE, now);
  const thumb = (
    <CoverThumb color={coverColorOf(game)} imageUrl={game.imageUrl} />
  );
  const place = copyState.line.findIndex((one) => one.id === loan.id) + 1;
  // The request the owner answers now: first in line, with the copy home and no yes waiting.
  const toAnswer =
    loan.status === "requested" &&
    place === 1 &&
    copyState.kind === "requested";

  let body: ReactNode;
  if (loan.status === "requested" && role === "borrower") {
    body = (
      <>
        <Title>{game.title}</Title>
        <Group
          label="Your request"
          aside={
            <Stamp tone="brown">
              {toAnswer ? "You asked" : `${ordinal(place)} in line`}
            </Stamp>
          }
        >
          <Summary
            thumb={thumb}
            lead={
              toAnswer
                ? `${other.name} hasn’t answered`
                : `You’re ${ordinal(place)} in line`
            }
            facts={[`Asked ${askedWhen(loan.createdAt, now)}`]}
          />
          {loan.requestNote && (
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-2xs font-medium text-muted-foreground">
                Your note
              </span>
              <span className="text-15">“{loan.requestNote}”</span>
            </div>
          )}
          <Person person={other} line={`It’s ${other.name}’s copy`} />
        </Group>
        {toAnswer && (
          <Group label="What you can do">
            <LoanMoveButton
              move="withdraw"
              loanId={loan.id}
              otherName={other.name}
              label="Withdraw my request"
              variant="secondary"
              title={`Withdraw your request for ${game.title}?`}
              body={`${other.name} is told.`}
            />
            <p className="font-mono text-2xs font-medium text-muted-foreground">
              If {other.name} says yes, this page shows where to pick it up.
            </p>
          </Group>
        )}
      </>
    );
  } else if (loan.status === "requested") {
    body = (
      <>
        <Title>{`${other.name} asked for ${game.title}`}</Title>
        <Group
          label="The request"
          aside={
            toAnswer ? undefined : (
              <Stamp tone="brown">{`${ordinal(place)} in line`}</Stamp>
            )
          }
        >
          <Summary
            thumb={thumb}
            lead={game.title}
            facts={[
              toAnswer
                ? "Your copy · at home"
                : "You answer it when it’s first in line and the game is home.",
            ]}
          />
          <Asker
            person={other}
            note={loan.requestNote}
            asked={askedWhen(loan.createdAt, now)}
          />
        </Group>
        {toAnswer && (
          <AnswerForm loanId={loan.id} borrower={other.name} today={today} />
        )}
      </>
    );
  } else if (loan.status === "accepted" && role === "owner") {
    body = (
      <>
        <Title>{game.title}</Title>
        <Group label="The loan" aside={<Stamp tone="navy">Said yes</Stamp>}>
          <Summary
            thumb={thumb}
            lead={`${other.name} hasn’t picked it up yet`}
            facts={[
              `You said yes ${formatWhen(loan.answeredAt ?? loan.updatedAt, now)}`,
              loan.dueOn
                ? `Until ${formatDate(loan.dueOn, today)}`
                : `${capitalized(periodWords(loan.periodDays))} from the day ${other.name} picks it up`,
            ]}
          />
          <Person person={other} line="to arrange the pick-up" />
        </Group>
        <Group label="What you can do">
          <OwnerPickUp
            loanId={loan.id}
            loan={loan}
            saidYesOn={saidYesOn(loan)}
            borrower={other}
            today={today}
          />
          <p className="text-xs text-muted-foreground">
            Use this if {other.name} picked it up and hasn’t said so. You give
            the day.
          </p>
        </Group>
        <Group label="Changed your mind?">
          <LoanMoveButton
            move="cancel"
            loanId={loan.id}
            otherName={other.name}
            label="Cancel this loan"
            variant="destructive"
            title="Cancel this loan?"
            body={`${other.name} is told.`}
          />
          <p className="text-xs text-muted-foreground">{other.name} is told.</p>
        </Group>
      </>
    );
  } else if (loan.status === "accepted") {
    body = (
      <>
        <Title>{`Pick up ${game.title} from ${other.name}`}</Title>
        <Group label="Next: pick it up">
          <Summary
            thumb={thumb}
            lead={game.title}
            facts={[
              `${other.name} said yes · yours ${
                loan.dueOn
                  ? `until ${formatDate(loan.dueOn, today)}`
                  : `for ${periodWords(loan.periodDays)}`
              }`,
            ]}
          />
          <Person person={other} line="to arrange the pick-up" />
          <p className="text-13 leading-snug text-muted-foreground">
            When the game is in your hands, come back and tap I’ve picked it up.
          </p>
          <LoanMoveButton
            move="cancel"
            loanId={loan.id}
            otherName={other.name}
            label="I can’t pick it up after all"
            variant="link"
            title="Cancel this loan?"
            body={`${other.name} is told, and the game is free for the next person.`}
          />
        </Group>
        <Group label="When you have it">
          <PickUpForm
            loanId={loan.id}
            loan={loan}
            saidYesOn={saidYesOn(loan)}
            borrower={view.you}
            today={today}
            submitLabel="I’ve picked it up"
          />
        </Group>
      </>
    );
  } else if (
    (loan.status === "out" || loan.status === "returning") &&
    role === "borrower"
  ) {
    body = <BorrowedLoan view={view} today={today} now={now} />;
  } else if (loan.status === "out" || loan.status === "returning") {
    body = <LentLoan view={view} today={today} now={now} />;
  } else {
    body = (
      <>
        <Title>{game.title}</Title>
        <Group label={role === "owner" ? "The loan" : "Your loan"}>
          <Summary
            thumb={thumb}
            lead={endedLine(loan, role, other.name)}
            facts={
              loan.pickedUpOn
                ? [
                    loan.returnedOn
                      ? `Picked up ${formatDate(loan.pickedUpOn, today)} · back ${formatDate(loan.returnedOn, today)}`
                      : datesLine(loan, today),
                  ]
                : []
            }
          />
          {other.phone && <Person person={other} line="" />}
        </Group>
      </>
    );
  }

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/loans", label: "Loans" }} />}
    >
      {body}
    </PageColumn>
  );
}

// The day of the owner's yes, the first a pick-up can be on.
function saidYesOn(loan: Loan): string {
  return todayIn(PLAN_TIME_ZONE, loan.answeredAt ?? loan.updatedAt);
}

// What happened to a loan that isn't a request or a yes any more. The loan out and its return
// get their own pages with U13.
function endedLine(
  loan: Loan,
  role: "owner" | "borrower",
  other: string,
): string {
  switch (loan.status) {
    case "declined":
      return role === "owner" ? `You said no to ${other}` : `${other} said no`;
    case "withdrawn":
      return role === "owner"
        ? `${other} withdrew the request`
        : "You withdrew your request";
    case "cancelled":
      return "Called off before the pick-up";
    case "returned":
    case "passed-along":
      return role === "owner" ? "Back with you" : `Back with ${other}`;
    default:
      return role === "owner" ? `${other} has it` : "You have it";
  }
}

// Everything the page reads, through its controller: a loan the member isn't part of, or an id
// that isn't one, is Not found.
async function loadLoan(loanId: string, userId: string) {
  try {
    return await getInjection("IGetLoanController")({ loanId }, userId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    throw err;
  }
}
