import Link from "next/link";
import { PAGES } from "@/src/content/pages";
import { TOPICS } from "@/src/content/topics";

// A mistyped or outdated link lands here, with every page listed so the reader can find theirs (R5).
export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <h1 className="font-semibold text-3xl">That page isn&apos;t here</h1>
        <p className="text-muted-foreground">
          The link may be mistyped, or the page may have moved. Here&apos;s
          everything on the site.
        </p>
      </header>
      <ul className="space-y-2">
        <li>
          <Link href="/" className="underline underline-offset-4">
            Home
          </Link>
        </li>
        {PAGES.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/${page.slug}`}
              className="underline underline-offset-4"
            >
              {page.title}
            </Link>
          </li>
        ))}
        {TOPICS.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={`/${topic.slug}`}
              className="underline underline-offset-4"
            >
              {topic.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
