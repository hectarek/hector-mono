import { Button } from "@repo/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@repo/ui/components/item";
import { Camera, ChevronRight, Link2, PenLine } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/app/_components/top-bar";

// Adding a recipe starts with how (ux-plan D34): from a web page, from photos or a file (D53),
// or by hand.
// Each keeps the book it was started from (?book=).
export default async function NewRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const { book } = await searchParams;
  const query = book ? `?book=${encodeURIComponent(book)}` : "";
  const choices = [
    {
      href: `/recipes/new/link${query}`,
      Icon: Link2,
      title: "Add by link",
      description: "A recipe's web page.",
    },
    {
      href: `/recipes/new/photo${query}`,
      Icon: Camera,
      title: "Add by photo or file",
      description: "Cookbook pages, screenshots, or a PDF or text file.",
    },
    {
      href: `/recipes/new/manual${query}`,
      Icon: PenLine,
      title: "Add manually",
      description: "Type it in, or paste a list.",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <TopBar
        start={
          <Button
            variant="ghost"
            size="lg"
            nativeButton={false}
            render={<Link href={book ? `/?book=${book}` : "/"} />}
            className="-ml-2"
          >
            Cancel
          </Button>
        }
        title="New recipe"
      />
      <ul className="flex flex-col gap-3">
        {choices.map(({ href, Icon, title, description }) => (
          <li key={href}>
            <Item variant="outline" render={<Link href={href} />}>
              <ItemMedia variant="icon">
                <Icon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{title}</ItemTitle>
                <ItemDescription>{description}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRight className="text-muted-foreground size-4" />
              </ItemActions>
            </Item>
          </li>
        ))}
      </ul>
    </div>
  );
}
