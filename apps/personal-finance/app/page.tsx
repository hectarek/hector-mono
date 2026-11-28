import { pageMetadata } from "@/src/seo";
import { SITE_NAME } from "@/src/site";

export const metadata = pageMetadata({
  title: SITE_NAME,
  description:
    "Money, explained in plain words, with tools to try the numbers.",
  path: "/",
});

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-semibold text-3xl">{SITE_NAME}</h1>
    </div>
  );
}
