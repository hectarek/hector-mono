import { ResourceItem } from "@/app/_components/resource-item";
import { resourcesByTopic } from "@/src/content/resources";
import { metadataForPage } from "@/src/seo";

export const metadata = metadataForPage("resources");

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <header className="space-y-3">
        <h1 className="font-semibold text-3xl">Where to learn more</h1>
        <p className="text-muted-foreground">
          The free courses, calculators and books worth your time, and why each
          one is. Links open on the other site, and your Back button brings you
          here.
        </p>
      </header>
      {resourcesByTopic().map(({ topic, resources }) => (
        <section
          key={topic.slug}
          aria-labelledby={`about-${topic.slug}`}
          className="space-y-4"
        >
          <h2 id={`about-${topic.slug}`} className="font-semibold text-xl">
            {topic.name}
          </h2>
          <ul className="space-y-6">
            {resources.map((resource) => (
              <ResourceItem key={resource.title} resource={resource} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
