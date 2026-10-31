import { Clock, ExternalLink, Users } from "lucide-react";
import type { Recipe } from "@/src/entities/models/recipe.model";

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Under a recipe's name: its time, what it serves, and the site it came from.
export function RecipeFacts({
  recipe,
}: {
  recipe: Pick<Recipe, "timeMinutes" | "yieldServings" | "sourceUrl">;
}) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {recipe.timeMinutes !== null && (
        <span className="flex items-center gap-1.5">
          <Clock className="size-4" aria-hidden />
          {recipe.timeMinutes} min
        </span>
      )}
      {recipe.yieldServings !== null && (
        <span className="flex items-center gap-1.5">
          <Users className="size-4" aria-hidden />
          Serves {recipe.yieldServings}
        </span>
      )}
      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground flex items-center gap-1.5 underline-offset-2 hover:underline"
        >
          <ExternalLink className="size-4" aria-hidden />
          {sourceHost(recipe.sourceUrl)}
        </a>
      )}
    </div>
  );
}
