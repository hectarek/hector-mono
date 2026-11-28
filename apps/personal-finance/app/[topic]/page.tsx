import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceItem } from "@/app/_components/resource-item";
import { PAGES } from "@/src/content/pages";
import { RESOURCES } from "@/src/content/resources";
import { TOPICS } from "@/src/content/topics";
import { pageMetadata } from "@/src/seo";

type TopicPageProps = { params: Promise<{ topic: string }> };

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }));
}

function findTopic(slug: string) {
  return TOPICS.find((t) => t.slug === slug);
}

export async function generateMetadata({
  params,
}: TopicPageProps): Promise<Metadata> {
  const topic = findTopic((await params).topic);
  if (!topic) return {};
  return pageMetadata({
    title: topic.name,
    description: topic.line,
    path: `/${topic.slug}`,
  });
}

export default async function TopicPage({ params }: TopicPageProps) {
  const topic = findTopic((await params).topic);
  if (!topic) notFound();

  const pages = PAGES.filter((p) => p.topic === topic.slug);
  const resources = RESOURCES.filter((r) => r.topics.includes(topic.slug));

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <header className="space-y-3">
        <h1 className="font-semibold text-3xl">{topic.name}</h1>
        <p className="text-muted-foreground">{topic.line}</p>
      </header>

      {pages.length > 0 ? (
        <ul className="space-y-3">
          {pages.map((page) => (
            <li key={page.slug}>
              <Link
                href={`/${page.slug}`}
                className="block rounded-lg border bg-card p-4 hover:bg-muted"
              >
                <span className="block font-semibold">{page.title}</span>
                <span className="mt-1 block text-base text-muted-foreground">
                  {page.summary}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          We haven&apos;t written our own guide to this yet. These are the best
          free ones we know.
        </p>
      )}

      <section aria-labelledby="go-further" className="space-y-4">
        <h2 id="go-further" className="font-semibold text-xl">
          {pages.length > 0 ? "Go further" : "Good places to start"}
        </h2>
        <ul className="space-y-6">
          {resources.map((resource) => (
            <ResourceItem key={resource.title} resource={resource} />
          ))}
        </ul>
      </section>
    </div>
  );
}
