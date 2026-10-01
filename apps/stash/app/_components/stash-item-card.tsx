"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { useFormStatus } from "react-dom";
import { completeItem, deleteItem } from "@/app/actions/stash-items";
import type { StashItem } from "@/src/entities/models/stash-item.model";

function getSourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function getTypeColor(
  type: StashItem["type"],
): "default" | "secondary" | "outline" {
  switch (type) {
    case "video":
      return "default";
    case "article":
      return "secondary";
    case "movie":
      return "outline";
    default:
      return "secondary";
  }
}

function SubmitButton({
  children,
  pendingText,
  variant = "outline",
}: {
  children: React.ReactNode;
  pendingText: string;
  variant?: "outline" | "quiet";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size="sm" disabled={pending}>
      {pending ? pendingText : children}
    </Button>
  );
}

export function StashItemCard({ item }: { item: StashItem }) {
  const domain = item.source ?? getSourceDomain(item.url);
  const isQueued = item.status === "queued";

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-medium hover:underline"
              >
                {item.title}
              </a>
              {domain && (
                <span className="text-muted-foreground truncate text-xs">
                  {domain}
                </span>
              )}
            </div>
            <Badge variant={getTypeColor(item.type)} className="shrink-0">
              {capitalize(item.type)}
            </Badge>
          </div>

          {item.description && (
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {item.description}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            {isQueued && (
              <form action={completeItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <SubmitButton pendingText="...">Done</SubmitButton>
              </form>
            )}
            <form action={deleteItem} className="ml-auto">
              <input type="hidden" name="itemId" value={item.id} />
              <SubmitButton variant="quiet" pendingText="...">
                Remove
              </SubmitButton>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
