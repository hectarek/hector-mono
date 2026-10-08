import { Button } from "@repo/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@repo/ui/components/item";
import { Camera, ChevronRight, ClipboardPaste, PenLine } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/app/_components/top-bar";

// Adding a recipe starts with how (ux-plan D34): from a link or a recipe's text, read for you
// (D73); from photos or a file (D53); or by hand. The words say which are read for you and
// which you type. Each keeps the book it was started from (?book=).
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
      Icon: ClipboardPaste,
      title: "Add by link or text",
      description:
        "Paste a recipe's link, or all of its text, and it's read into the form for you.",
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
      description:
        "Type it in yourself. A list you paste is split into rows, not read.",
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
