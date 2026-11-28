import { ResourceItem } from "@/app/_components/resource-item";
import { PAGES } from "@/src/content/pages";
import { RESOURCES } from "@/src/content/resources";
import { metadataForPage } from "@/src/seo";
import { GrowthCalculator } from "./growth-calculator";

export const metadata = metadataForPage("compound-growth");

const TITLE = PAGES.find((p) => p.slug === "compound-growth")?.title;

// The outside tool for going further (R17), from the resources list. A renamed entry fails the
// build rather than dropping the link.
function furtherResource() {
  const resource = RESOURCES.find(
    (r) => r.title === "Compound Interest Calculator",
  );
  if (!resource) {
    throw new Error(
      'No "Compound Interest Calculator" in src/content/resources.ts',
    );
  }
  return resource;
}

export default function CompoundGrowthPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 px-4 py-10">
      <header className="space-y-3">
        <h1 className="font-semibold text-3xl">{TITLE}</h1>
        <p>
          Money you invest can earn a return: a gain each year, as a percent of
          what&apos;s there. The next year, that gain earns a return too. This
          is compound growth, and over many years it does most of the work.
        </p>
      </header>

      <GrowthCalculator />

      <section aria-labelledby="how-it-works" className="space-y-3">
        <h2 id="how-it-works" className="font-semibold text-xl">
          How this works
        </h2>
        <p>
          This adds the return once a year. A yearly deposit goes in at the
          start of each year. A monthly deposit goes in at the end of each
          month, and until the year ends it earns simple interest: interest on
          the deposit alone. Then everything earns the year&apos;s return
          together.
        </p>
        <p>
          Real accounts often add their growth every month or every day, which
          comes to a little more than this shows.
        </p>
      </section>

      <section aria-labelledby="left-out" className="space-y-3">
        <h2 id="left-out" className="font-semibold text-xl">
          What this leaves out
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Ups and downs. Real investments have good years and bad ones. This
            uses the same return every year.
          </li>
          <li>Taxes and fees, which take some of the growth.</li>
          <li>
            Raises. Your deposit stays the same number of dollars every year, so
            in today&apos;s dollars each one is worth a little less than the
            last.
          </li>
        </ul>
      </section>

      <section aria-labelledby="go-further" className="space-y-4">
        <h2 id="go-further" className="font-semibold text-xl">
          Go further
        </h2>
        <ul>
          <ResourceItem resource={furtherResource()} />
        </ul>
      </section>
    </div>
  );
}
