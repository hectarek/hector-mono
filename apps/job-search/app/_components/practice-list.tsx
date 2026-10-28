import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@repo/ui/components/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import Link from "next/link";
import { formatDay } from "@/app/_lib/format-day";
import { PRACTICE_RESULT_LABELS } from "@/app/_lib/job-labels";
import type { PracticeSession } from "@/src/entities/models/practice-entry.model";

// A session's next review, or that its reviews are done.
export function nextReviewOf({ nextReview }: PracticeSession): string {
  return nextReview
    ? `Review ${nextReview.step} · ${formatDay(nextReview.dueOn)}`
    : "Done";
}

// Sessions, the latest first: a table on desktop, cards on phones (docs/build-plan.md KTD19).
export function PracticeList({ sessions }: { sessions: PracticeSession[] }) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Problem or topic</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Next review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <Link
                    href={`/practice/${session.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {session.topic}
                  </Link>
                </TableCell>
                <TableCell>{formatDay(session.practicedOn)}</TableCell>
                <TableCell>{PRACTICE_RESULT_LABELS[session.result]}</TableCell>
                <TableCell>{nextReviewOf(session)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {sessions.map((session) => (
          <li key={session.id}>
            <Item
              variant="outline"
              render={<Link href={`/practice/${session.id}`} />}
            >
              <ItemContent>
                <ItemTitle>{session.topic}</ItemTitle>
                <ItemDescription>
                  {[
                    formatDay(session.practicedOn),
                    PRACTICE_RESULT_LABELS[session.result],
                    nextReviewOf(session),
                  ].join(" · ")}
                </ItemDescription>
              </ItemContent>
            </Item>
          </li>
        ))}
      </ul>
    </>
  );
}
