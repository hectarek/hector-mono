import { Badge } from "@repo/ui/components/badge";
import Link from "next/link";
import type { ReactNode } from "react";
import { withFrom } from "@/app/_lib/back-link";
import type { PersonRef } from "@/src/entities/models/person.model";

// A record's people, compact: a company's people, a job's contacts (R1, R4). `action` draws what a
// row offers beside the person, such as taking a contact off a job. `from` is the page the list
// is on, which a person's back link returns to (the UX plan's UX8).
export function ContactList({
  people,
  action,
  from,
}: {
  people: PersonRef[];
  action?: (person: PersonRef) => ReactNode;
  from?: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {people.map((person) => (
        <li
          key={person.id}
          className="flex min-h-11 flex-wrap items-center justify-between gap-2"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
            <Link
              href={withFrom(`/people/${person.id}`, from)}
              className="font-medium underline underline-offset-4"
            >
              {person.name}
            </Link>
            {person.role ? (
              <span className="text-muted-foreground">{person.role}</span>
            ) : null}
            {person.rank ? (
              <Badge variant="secondary">{person.rank}</Badge>
            ) : null}
          </div>
          {action?.(person)}
        </li>
      ))}
    </ul>
  );
}
