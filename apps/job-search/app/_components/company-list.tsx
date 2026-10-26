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
import type { CompanySummary } from "@/src/entities/models/company.model";

// A page of companies: a table on desktop, cards on phones (docs/build-plan.md KTD19).
export function CompanyList({ companies }: { companies: CompanySummary[] }) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <Link
                    href={`/companies/${company.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {company.name}
                  </Link>
                </TableCell>
                <TableCell>{company.industry ?? "—"}</TableCell>
                <TableCell>{company.location ?? "—"}</TableCell>
                <TableCell>{company.tier ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden">
        {companies.map((company) => (
          <li key={company.id}>
            <Item
              variant="outline"
              render={<Link href={`/companies/${company.id}`} />}
            >
              <ItemContent>
                <ItemTitle>{company.name}</ItemTitle>
                {company.industry || company.location ? (
                  <ItemDescription>
                    {[company.industry, company.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </ItemDescription>
                ) : null}
              </ItemContent>
              {company.tier ? (
                <ItemActions>
                  <Badge variant="secondary">Tier {company.tier}</Badge>
                </ItemActions>
              ) : null}
            </Item>
          </li>
        ))}
      </ul>
    </>
  );
}
