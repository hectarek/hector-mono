import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { DeleteButton } from "@/app/_components/delete-button";
import { OnlyHector } from "@/app/_components/only-hector";
import { nextReviewOf } from "@/app/_components/practice-list";
import { PracticeReview } from "@/app/_components/practice-review";
import { RecordHistory } from "@/app/_components/record-history";
import { getPageActor } from "@/app/_lib/current-actor";
import { FIELD_LABELS } from "@/app/_lib/field-labels";
import { formatDay } from "@/app/_lib/format-day";
import { PRACTICE_RESULT_LABELS } from "@/app/_lib/job-labels";
import { loadPracticeSession } from "@/app/_lib/load-practice-session";
import { deletePracticeEntry } from "@/app/actions/practice";
import type { PracticeReview as Review } from "@/src/entities/models/practice-entry.model";
import { type ReviewStep, reviewSteps } from "@/src/entities/practice-ladder";

// A practice session (R11): its problem or topic, how its try went, its next review, its reviews
// in the order they happened, and its history (R19). Deleting it, or one of its reviews, is
// Hector's alone (KTD3).
export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getPageActor();
  const { id } = await params;
  const session = await loadPracticeSession(id, actor);
  const human = actor.actor === "owner";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/practice"
          className="text-muted-foreground flex min-h-11 w-fit items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Practice
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight break-words">
              {session.topic}
            </h1>
            {session.type || session.pattern ? (
              <p className="text-muted-foreground text-sm">
                {[session.type, session.pattern].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {session.nextReview ? (
              <PracticeReview
                session={{
                  id: session.id,
                  topic: session.topic,
                  step: session.nextReview.step,
                }}
              />
            ) : null}
            {human ? (
              <DeleteButton
                what="this session and its reviews"
                action={deletePracticeEntry.bind(null, { id: session.id })}
                then="/practice"
              />
            ) : (
              <OnlyHector labels={["Delete"]} />
            )}
          </div>
        </div>
      </div>

      <section
        aria-labelledby="practice-session"
        className="flex flex-col gap-2"
      >
        <h2 id="practice-session" className="font-semibold">
          Session
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          <Row label={FIELD_LABELS.practicedOn ?? "Date"}>
            {formatDay(session.practicedOn)}
          </Row>
          <Row label={FIELD_LABELS.result ?? "Result"}>
            {PRACTICE_RESULT_LABELS[session.result]}
          </Row>
          <Row label={FIELD_LABELS.minutes ?? "Minutes"}>
            {session.minutes ?? <None />}
          </Row>
          <Row label={FIELD_LABELS.aiUsed ?? "AI used"}>
            {session.aiUsed ? "Yes" : "No"}
          </Row>
          <Row label="Next review">{nextReviewOf(session)}</Row>
        </dl>
        {session.notes ? (
          <p className="text-sm whitespace-pre-wrap break-words">
            {session.notes}
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="practice-reviews"
        className="flex flex-col gap-2"
      >
        <h2 id="practice-reviews" className="font-semibold">
          Reviews
        </h2>
        {session.reviews.length ? (
          <ul className="flex flex-col gap-3">
            {stepsOf(session.reviews).map(({ review, step }) => (
              <li
                key={review.id}
                className="flex flex-wrap items-start justify-between gap-2"
              >
                <ReviewLine review={review} step={step} />
                {human ? (
                  <DeleteButton
                    what="this review"
                    action={deletePracticeEntry.bind(null, { id: review.id })}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No reviews yet.</p>
        )}
      </section>

      <RecordHistory record={{ kind: "practice-entry", id: session.id }} />
    </div>
  );
}

// Each review with the step it was on (R11).
function stepsOf(reviews: Review[]): { review: Review; step: ReviewStep }[] {
  const steps = reviewSteps(reviews);
  return reviews.map((review, index) => ({
    review,
    step: steps[index] ?? 1,
  }));
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-6">
      <dt className="text-muted-foreground shrink-0 sm:w-36">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function None() {
  return <span className="text-muted-foreground">—</span>;
}

// One review: its step, how it went and when, its minutes and AI, and its notes, as plain text
// (docs/build-plan.md KTD21).
function ReviewLine({ review, step }: { review: Review; step: ReviewStep }) {
  const details = [
    review.minutes ? `${review.minutes} min` : null,
    review.aiUsed ? "AI used" : null,
  ].filter(Boolean);
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-sm">
      <span className="font-medium">
        Review {step} · {PRACTICE_RESULT_LABELS[review.result]}
        <span className="text-muted-foreground font-normal">
          {" "}
          · {formatDay(review.practicedOn)}
        </span>
      </span>
      {details.length ? (
        <span className="text-muted-foreground">{details.join(" · ")}</span>
      ) : null}
      {review.notes ? (
        <span className="whitespace-pre-wrap break-words">{review.notes}</span>
      ) : null}
    </div>
  );
}
