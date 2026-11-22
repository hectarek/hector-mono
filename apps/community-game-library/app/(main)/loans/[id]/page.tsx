import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { AppHeader } from "@/app/_components/app-header";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Group } from "@/app/_components/group";
import { PhoneIcon } from "@/app/_components/icons";
import { PageColumn } from "@/app/_components/page-column";
import { Piece } from "@/app/_components/piece";
import { Stamp } from "@/app/_components/stamp";
import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { ordinal } from "@/src/entities/loan";
import type { Loan } from "@/src/entities/models/loan.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { coverColorOf } from "@/src/entities/piece";
import {
  formatDate,
  formatWhen,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";
import { AnswerForm } from "./answer-form";
import { LoanMoveButton } from "./loan-move-button";

// A loan's page, for its copy's owner and its borrower only (D14: the one place its buttons live).
// U12 draws the request and the yes: C16 to the borrower while it waits, C2 to the owner while
// it's theirs to answer, C17 to the owner after a yes, and C3's top to the borrower, with I can't
// pick it up after all; U13 adds the pick-up and the loan out.
export default async function LoanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { user } = await gate("app");
  const { id } = await params;
  const { loan, role, game, other, copyState } = await loadLoan(id, user.id);
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
      </>
    );
  } else {
    body = (
      <>
        <Title>{game.title}</Title>
        <Group label={role === "owner" ? "The loan" : "Your loan"}>
          <Summary
            thumb={thumb}
            lead={endedLine(loan, role, other.name)}
            facts={
              loan.dueOn && loan.pickedUpOn
                ? [`Due ${formatDate(loan.dueOn, today)}`]
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

function Title({ children }: { children: string }) {
  return (
    <h1 className="text-2xl leading-7 font-bold wrap-break-word">{children}</h1>
  );
}

// The game's token, a lead line in bold, and facts in mono under it.
function Summary({
  thumb,
  lead,
  facts,
}: {
  thumb: ReactNode;
  lead: string;
  facts: string[];
}) {
  return (
    <div className="flex items-center gap-3">
      {thumb}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-15 font-bold">{lead}</span>
        {facts.map((fact) => (
          <span
            key={fact}
            className="font-mono text-2xs font-medium text-muted-foreground"
          >
            {fact}
          </span>
        ))}
      </div>
    </div>
  );
}

// The other person in the loan: their piece and name, why they're here, and their phone, which
// the other person in an open loan sees, friends or not (R40).
function Person({
  person,
  line,
}: {
  person: NameAndPiece & { phone: string | null };
  line: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Piece shape={person.pieceShape} color={person.pieceColor} size={20} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-15 font-bold">{person.name}</span>
        {line && <span className="text-xs text-muted-foreground">{line}</span>}
      </div>
      {person.phone && (
        <a
          href={`tel:${person.phone.replace(/[^\d+]/g, "")}`}
          aria-label={`Call ${person.name}, ${person.phone}`}
          className="flex min-h-11 items-center gap-1.5 font-mono text-13 font-medium text-foreground hover:text-destructive"
        >
          <PhoneIcon />
          <span className="border-b-2 border-dashed border-current pb-px">
            {person.phone}
          </span>
        </a>
      )}
    </div>
  );
}

// C2's asker: their piece and name, their note, and when they asked.
function Asker({
  person,
  note,
  asked,
}: {
  person: NameAndPiece;
  note: string | null;
  asked: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Piece shape={person.pieceShape} color={person.pieceColor} size={20} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-15 font-bold">{person.name}</span>
        {note && <span className="text-15">“{note}”</span>}
        <span className="font-mono text-2xs font-medium text-muted-foreground">
          Asked {asked}
        </span>
      </div>
    </div>
  );
}

// "20 min ago" within the hour, as C2 says it, then C16's "this morning".
function askedWhen(at: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000);
  return minutes < 60 ? `${Math.max(minutes, 1)} min ago` : formatWhen(at, now);
}

// A yes's period in words (R16): 1 week, 2 weeks, a month.
const PERIOD_WORDS: Partial<Record<number, string>> = {
  7: "1 week",
  14: "2 weeks",
  30: "a month",
};

function periodWords(days: number | null): string {
  return days === null ? "" : (PERIOD_WORDS[days] ?? `${days} days`);
}

const capitalized = (words: string) =>
  `${words.charAt(0).toUpperCase()}${words.slice(1)}`;

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
