import Link from "next/link";
import type { TOPICS } from "@/src/content/topics";

export function TopicTile({ topic }: { topic: (typeof TOPICS)[number] }) {
  const { slug, name, line } = topic;
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
