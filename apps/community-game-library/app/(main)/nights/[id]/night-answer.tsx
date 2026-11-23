"use client";

import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import Link from "next/link";
import { type ReactNode, useState, useTransition } from "react";
import { ChangedNotice } from "@/app/_components/changed-notice";
import { Group } from "@/app/_components/group";
import { MinusIcon, PlusIcon } from "@/app/_components/icons";
import { Sheet, SheetActions } from "@/app/_components/sheet";
import { Stamp } from "@/app/_components/stamp";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { answerNight } from "@/app/actions/nights";
import type { ActionState } from "@/app/actions/shared";
import { ordinal } from "@/src/entities/loan";

type Answer = "going" | "waitlisted" | "maybe" | "cant-go";

// What the answer parts need of the night and the member.
export type AnswerContext = {
  gameNightId: string;
  // "Saturday game night · Sat, Nov 14 · 7 PM", D3's line.
  line: string;
  hostName: string;
  guestsAllowed: boolean;
  attendeesCanInvite: boolean;
  you: "invited" | "going" | "maybe" | "cant-go" | "waitlisted" | null;
  guestCount: number;
  seatsOpen: number;
  waitlisted: number;
  // Their place on the waitlist, while they're on it.
  place: number | null;
  canInvite: boolean;
};

const MOST_GUESTS = 9;
const seats = (count: number) => (count === 1 ? "seat" : "seats");
const guestsWord = (count: number) => (count === 1 ? "guest" : "guests");

// Sends an answer, says what happened, and hands a seat taken meanwhile back as the changed line.
function useAnswer(gameNightId: string) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();
  const send = (answer: Answer, guests = 0, then?: () => void) =>
    startTransition(async () => {
      const result = await callResultAction(() =>
        answerNight(gameNightId, answer, guests),
      );
      if (result && "message" in result && result.message) {
        setState(null);
        notify(result.message);
        then?.();
        return;
      }
      setState(result && "ok" in result ? { error: result.error } : result);
    });
  return { state, pending, send };
}

// Who invites, under the answer (D2, D13): the host alone, or people going too.
function InviteLine({ context }: { context: AnswerContext }) {
  if (context.canInvite) {
    return (
      <Button
        variant="secondary"
        nativeButton={false}
        render={<Link href={`/nights/${context.gameNightId}/invite`} />}
      >
        Invite people
      </Button>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      {context.attendeesCanInvite
        ? "People going can invite others."
        : `Only ${context.hostName} invites people.`}
    </p>
  );
}

// Your answer, for anyone but the host (D2, D4, D13; R31): the three answers while there's room,
// the waitlist when it's full (D4), "You + 0 guests" with Change answer or guests once going
// (D13, opening D3), and your place on the waitlist with Leave the waitlist while you wait.
export function YourAnswer({ context }: { context: AnswerContext }) {
  const { state, pending, send } = useAnswer(context.gameNightId);
  const [changing, setChanging] = useState(false);

  let body: ReactNode;
  if (context.you === "going") {
    body = (
      <>
        <p className="flex items-center gap-2.5 text-15 font-bold">
          <Stamp tilt={2}>Going</Stamp>
          You + {context.guestCount} {guestsWord(context.guestCount)}
        </p>
        <Button variant="secondary" onClick={() => setChanging(true)}>
          Change answer or guests
        </Button>
        <InviteLine context={context} />
      </>
    );
  } else if (context.you === "waitlisted") {
    body = (
      <>
        <p className="text-15 font-bold">
          Waitlist · you’re {ordinal(context.place ?? 1)}
        </p>
        <p className="text-13 leading-snug text-muted-foreground">
          When a seat opens it goes to the first person waiting, who is told.
        </p>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => send("cant-go")}
        >
          Leave the waitlist
        </Button>
      </>
    );
  } else if (context.seatsOpen === 0) {
    body = (
      <>
        <p className="text-sm">
          The night is full.{" "}
          {context.waitlisted === 0
            ? "Nobody is waiting yet."
            : `${context.waitlisted} waiting.`}
        </p>
        <p className="text-13 leading-snug text-muted-foreground">
          When a seat opens it goes to the first person waiting, who is told.
          You don’t confirm again, so leave the waitlist if your plans change.
          {context.guestsAllowed && " With a guest you wait for two seats."}
        </p>
        <div className="mt-1 flex gap-2.5">
          <Button
            size="lg"
            className="flex-1"
            disabled={pending}
            onClick={() => send("waitlisted")}
          >
            Join the waitlist
          </Button>
          <Button
            size="lg"
            variant="secondary"
            disabled={pending}
            onClick={() => send("cant-go")}
          >
            Can’t go
          </Button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div className="flex gap-2.5">
          <Button
            size="lg"
            className="flex-1"
            disabled={pending}
            onClick={() => send("going")}
          >
            I’m going
          </Button>
          <Button
            size="lg"
            variant="secondary"
            disabled={pending}
            onClick={() => send("maybe")}
          >
            Maybe
          </Button>
          <Button
            size="lg"
            variant="secondary"
            disabled={pending}
            onClick={() => send("cant-go")}
          >
            Can’t go
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {context.guestsAllowed &&
            "Bringing someone? Answer first, then add your guests. "}
          {context.attendeesCanInvite
            ? "People going can invite others."
            : `Only ${context.hostName} invites people.`}
        </p>
      </>
    );
  }

  return (
    <Group label="Your answer">
      {state?.changed ? (
        <ChangedNotice
          reason={state.changed}
          onNext={() => send("waitlisted")}
        />
      ) : (
        <>
          {body}
          {state?.error && (
            <p role="alert" className="text-xs text-destructive">
              {state.error}
            </p>
          )}
        </>
      )}
      <AnswerSheet
        open={changing}
        onOpenChange={setChanging}
        context={context}
      />
    </Group>
  );
}

// Change answer or guests (D3, R31, R47): going, maybe or can't go, and the guests the member
// brings when the host lets them, each taking a seat. More guests than seats says so, with Go
// alone or Join the waitlist for a member not going yet (AE4); someone going can't bring more than
// the seats open.
function AnswerSheet({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AnswerContext;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Your answer">
      <AnswerChoices context={context} done={() => onOpenChange(false)} />
    </Sheet>
  );
}

// The sheet's content, which starts from the member's answer each time it opens.
function AnswerChoices({
  context,
  done,
}: {
  context: AnswerContext;
  done: () => void;
}) {
  const going = context.you === "going";
  const [answer, setAnswer] = useState<"going" | "maybe" | "cant-go">(
    context.you === "maybe" || context.you === "cant-go"
      ? context.you
      : "going",
  );
  const [guests, setGuests] = useState(going ? context.guestCount : 0);
  const { state, pending, send } = useAnswer(context.gameNightId);
  // The seats this member can fill: the open ones, and their own while they're going.
  const room = context.seatsOpen + (going ? 1 + context.guestCount : 0);
  const canBring = Math.max(0, room - 1);
  const over = answer === "going" && 1 + guests > room;
  const bringing = answer === "going" && context.guestsAllowed;

  if (state?.changed) {
    return (
      <ChangedNotice
        reason={state.changed}
        onNext={() => send("waitlisted", guests, done)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-13 text-muted-foreground">{context.line}</p>
      <RadioGroup
        aria-label="Your answer"
        value={answer}
        onValueChange={(next) =>
          setAnswer(
            next === "maybe"
              ? "maybe"
              : next === "cant-go"
                ? "cant-go"
                : "going",
          )
        }
      >
        {(
          [
            ["going", "Going"],
            ["maybe", "Maybe"],
            ["cant-go", "Can’t go"],
          ] as const
        ).map(([value, words]) => (
          <div key={value} className="flex items-center gap-2.5">
            <RadioGroupItem id={`answer-${value}`} value={value} />
            <label
              htmlFor={`answer-${value}`}
              className="flex min-h-11 flex-1 items-center text-15"
            >
              {words}
            </label>
          </div>
        ))}
      </RadioGroup>
      {bringing && (
        <div className="flex flex-col gap-2.5 rounded-lg border-2 border-foreground bg-card px-3.5 py-3">
          <span className="font-mono text-2xs font-medium tracking-wider text-muted-foreground uppercase">
            Guests you’re bringing
          </span>
          <ButtonGroup aria-label="Guests you’re bringing">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="One guest fewer"
              disabled={guests === 0}
              onClick={() => setGuests(guests - 1)}
            >
              <MinusIcon />
            </Button>
            <output
              aria-live="polite"
              className="flex h-11 w-14 items-center justify-center border-y-2 border-foreground bg-secondary font-mono text-lg font-medium"
            >
              {guests}
            </output>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="One guest more"
              disabled={guests >= MOST_GUESTS || (going && guests >= canBring)}
              onClick={() => setGuests(guests + 1)}
            >
              <PlusIcon />
            </Button>
          </ButtonGroup>
          <span className="text-xs text-muted-foreground">
            {over
              ? `Only ${room} ${seats(room)} ${room === 1 ? "is" : "are"} left. Go alone, or join the waitlist for ${1 + guests} seats.`
              : canBring === 0
                ? "Each guest takes a seat. No seats are open for guests."
                : `Each guest takes a seat. ${context.seatsOpen} ${seats(context.seatsOpen)} ${context.seatsOpen === 1 ? "is" : "are"} open, so you can bring ${canBring} ${guestsWord(canBring)}.`}
          </span>
        </div>
      )}
      {state?.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
      <SheetActions>
        {over ? (
          <>
            <Button
              size="lg"
              disabled={pending}
              onClick={() => send("going", 0, done)}
            >
              Go alone
            </Button>
            <Button
              size="lg"
              variant="secondary"
              disabled={pending}
              onClick={() => send("waitlisted", guests, done)}
            >
              Join the waitlist
            </Button>
          </>
        ) : (
          <Button
            size="lg"
            disabled={pending}
            onClick={() => send(answer, answer === "going" ? guests : 0, done)}
          >
            Save
          </Button>
        )}
      </SheetActions>
    </div>
  );
}
