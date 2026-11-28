import Link from "next/link";
import { HOME_LINE } from "@/src/content/pages";
import { TOPICS } from "@/src/content/topics";
import { pageMetadata } from "@/src/seo";
import { SITE_NAME } from "@/src/site";
import { TopicTile } from "./_components/topic-tile";

export const metadata = pageMetadata({
  title: SITE_NAME,
  description: HOME_LINE,
  path: "/",
});

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <header className="space-y-3">
        <h1 className="font-semibold text-3xl">{SITE_NAME}</h1>
        <p className="text-muted-foreground">{HOME_LINE}</p>
      </header>

      <Link
        href="/start"
        className="block rounded-lg border bg-primary p-6 text-primary-foreground"
      >
        <span className="block font-semibold text-2xl">Start here</span>
        <span className="mt-2 block">
          A short walk through how money works, one idea at a time.
        </span>
      </Link>

      <section
        id="topics"
        aria-labelledby="topics-heading"
        className="space-y-4"
      >
        <h2 id="topics-heading" className="font-semibold text-xl">
          Topics
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TOPICS.map((topic) => (
            <li key={topic.slug}>
              <TopicTile
                slug={topic.slug}
                name={topic.name}
                line={topic.line}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
