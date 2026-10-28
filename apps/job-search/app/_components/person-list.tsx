import { Badge } from "@repo/ui/components/badge";
import {
  Item,
  ItemActions,
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
import type { PersonSummary } from "@/src/entities/models/person.model";

// The latest day Hector and a person were in touch: a message, a reply or a conversation held.
function lastContact({
  messagedOn,
  repliedOn,
  metOn,
}: PersonSummary): string | null {
  return (
    [messagedOn, repliedOn, metOn]
      .filter((day): day is string => day !== null)
      .sort()
      .at(-1) ?? null
  );
}

// A person's next step, with its date when it has one.
function nextOf({ nextStep, nextDate }: PersonSummary): string | null {
  if (!nextStep && !nextDate) {
    return null;
  }
  return [nextStep, nextDate && formatDay(nextDate)]
    .filter(Boolean)
    .join(" · ");
}

// A page of people: a table on desktop, cards on phones (docs/build-plan.md KTD19).
export function PersonList({ people }: { people: PersonSummary[] }) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Next</TableHead>
              <TableHead>Last in touch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => {
              const last = lastContact(person);
              return (
                <TableRow key={person.id}>
                  <TableCell>
                    <Link
                      href={`/people/${person.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {person.name}
                    </Link>
                  </TableCell>
                  <TableCell>{person.company?.name ?? "—"}</TableCell>
                  <TableCell>{person.rank ?? "—"}</TableCell>
                  <TableCell>{nextOf(person) ?? "—"}</TableCell>
                  <TableCell>{last ? formatDay(last) : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {people.map((person) => {
          const next = nextOf(person);
          return (
            <li key={person.id}>
              <Item
                variant="outline"
                render={<Link href={`/people/${person.id}`} />}
              >
                <ItemContent>
                  <ItemTitle>{person.name}</ItemTitle>
                  {person.company || next ? (
                    <ItemDescription>
                      {[person.company?.name, next].filter(Boolean).join(" · ")}
                    </ItemDescription>
                  ) : null}
                </ItemContent>
                {person.rank ? (
                  <ItemActions>
                    <Badge variant="secondary">{person.rank}</Badge>
                  </ItemActions>
                ) : null}
              </Item>
            </li>
          );
        })}
      </ul>
    </>
  );
}
