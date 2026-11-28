import { wordsInOrder } from "@/src/content/words";
import { metadataForPage } from "@/src/seo";

export const metadata = metadataForPage("words");

export default function WordsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <h1 className="font-semibold text-3xl">
          Money words, in plain English
        </h1>
        <p className="text-muted-foreground">
          Every money word this site uses, each explained in a sentence or two.
        </p>
      </header>
      <dl className="space-y-6">
        {wordsInOrder().map(({ slug, entry }) => (
          <div key={slug} id={slug} className="scroll-mt-20 space-y-1">
            <dt className="font-semibold">{entry.word}</dt>
            <dd>{entry.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
