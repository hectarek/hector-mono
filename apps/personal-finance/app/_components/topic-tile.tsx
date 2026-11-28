import Link from "next/link";

export function TopicTile({
  slug,
  name,
  line,
}: {
  slug: string;
  name: string;
  line: string;
}) {
  return (
    <Link
      href={`/${slug}`}
      className="block rounded-lg border bg-card p-4 hover:bg-muted"
    >
      <span className="block font-semibold">{name}</span>
      <span className="mt-1 block text-base text-muted-foreground">{line}</span>
    </Link>
  );
}
