"use client";

import { Button } from "@repo/ui/components/button";
import { FieldError } from "@repo/ui/components/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Textarea } from "@repo/ui/components/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Group } from "@/app/_components/group";
import { useLeaveGuard } from "@/app/_lib/leave-guard";
import { notify } from "@/app/_lib/notify";
import { answerSuggestion } from "@/app/actions/admin";

type Answer = "added" | "already-here" | "declined";

// G2's Your answer: Add it (Add it by hand opens G3 with what was sent), It's already here (the
// game picked from the catalog's matches above), or Decline (with a reason). Send answer stays
// off until the answer has what it needs. Each label sits beside its radio: a Base UI control
// inside its own label flips twice on one click in happy-dom.
export function AnswerForm({
  suggestionId,
  who,
  matches,
}: {
  suggestionId: string;
  // Who sent it, for "Ben is told either way".
  who: string;
  // The catalog's matches for It's already here: "Chess (1475)".
  matches: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState<Answer>("added");
  const [gameId, setGameId] = useState(matches[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [state, submit, pending] = useActionState(answerSuggestion, null);
  useLeaveGuard(
    answer === "declined" && reason.trim() !== "" && !state?.message,
  );

  useEffect(() => {
    if (state?.message) {
      notify(state.message);
      router.push("/admin");
    }
  }, [state, router]);

  const ready =
    (answer === "already-here" && gameId !== "") ||
    (answer === "declined" && reason.trim() !== "");
  const option = (value: Answer, words: string, help?: string) => (
    <div className="flex items-center gap-2.5">
      <RadioGroupItem id={`answer-${value}`} value={value} />
      <label
        htmlFor={`answer-${value}`}
        className="flex min-h-11 flex-1 flex-col justify-center gap-px text-15"
      >
        {words}
        {help && (
          <span className="text-xs leading-snug text-muted-foreground">
            {help}
          </span>
        )}
      </label>
    </div>
  );

  return (
    <form action={submit} className="flex flex-col gap-3">
      <input type="hidden" name="suggestionId" value={suggestionId} />
      <input type="hidden" name="answer" value={answer} />
      <Group label="Your answer">
        <RadioGroup
          aria-label="Your answer"
          value={answer}
          onValueChange={(next) => {
            if (
              next === "added" ||
              next === "already-here" ||
              next === "declined"
            ) {
              setAnswer(next);
            }
          }}
        >
          {option("added", "Add it")}
          {answer === "added" && (
            <div className="flex flex-col gap-1.5 pb-2.5 pl-8.5">
              <Button
                size="lg"
                nativeButton={false}
                render={
                  <Link href={`/admin/games/new?suggestion=${suggestionId}`} />
                }
              >
                Add it by hand
              </Button>
              <span className="text-xs text-muted-foreground">
                The form starts with what {who} sent.
              </span>
            </div>
          )}
          {option(
            "already-here",
            "It’s already here",
            `You pick the game, and ${who} is pointed to it.`,
          )}
          {answer === "already-here" && (
            <div className="pb-2.5 pl-8.5">
              {matches.length > 0 ? (
                <NativeSelect
                  name="gameId"
                  aria-label="The game"
                  value={gameId}
                  onChange={(event) => setGameId(event.target.value)}
                  className="w-full"
                >
                  {matches.map((match) => (
                    <NativeSelectOption key={match.id} value={match.id}>
                      {match.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <p className="text-13 text-muted-foreground">
                  Search the catalog above to find it.
                </p>
              )}
            </div>
          )}
          {option("declined", "Decline", "You give a reason.")}
          {answer === "declined" && (
            <div className="pb-2.5 pl-8.5">
              <Textarea
                name="declineNote"
                aria-label="Reason"
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              {state?.fields?.declineNote && (
                <FieldError>{state.fields.declineNote}</FieldError>
              )}
            </div>
          )}
        </RadioGroup>
        <p className="text-13 leading-snug text-muted-foreground">
          {who} is told either way. If it’s added or already here, it lands in
          their library.
        </p>
      </Group>
      {state?.error && !state.fields && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
      {answer !== "added" && (
        <Button type="submit" size="lg" disabled={!ready || pending}>
          Send answer
        </Button>
      )}
    </form>
  );
}
