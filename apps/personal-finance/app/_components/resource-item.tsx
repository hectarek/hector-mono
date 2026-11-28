import type { RESOURCES } from "@/src/content/resources";
import { formatDate } from "@/src/finance/format";

type Resource = (typeof RESOURCES)[number];

// One outside resource: what it is, who made it, and Hector's line on why it's worth the time.
// Links open in the same tab, so the browser's Back button returns here (R20).
export function ResourceItem({ resource }: { resource: Resource }) {
  return (
    <li className="space-y-1">
      <p className="font-semibold">
        {resource.link ? (
          <a href={resource.link.url} className="underline underline-offset-4">
            {resource.title}
          </a>
        ) : (
          <cite className="not-italic">{resource.title}</cite>
        )}
        <span className="font-normal text-muted-foreground">
          {" "}
          · {resource.by}
          {resource.link ? "" : " (book)"}
        </span>
      </p>
      <p>{resource.note}</p>
      {resource.caveat && (
        <p className="text-base text-muted-foreground">{resource.caveat}</p>
      )}
      {resource.link?.checked && (
        <p className="text-base text-muted-foreground">
          Link checked {formatDate(resource.link.checked)}
        </p>
      )}
    </li>
  );
}
