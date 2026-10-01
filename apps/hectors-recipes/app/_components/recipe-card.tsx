import { Clock, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProduceTile, produceFor } from "@/app/_components/produce-tile";
import type { Recipe } from "@/src/entities/models/recipe.model";

export function RecipeCard({
  recipe,
  bookName,
}: {
  recipe: Recipe;
  // Which book it's in, when the grid mixes books (All recipes).
  bookName?: string;
}) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="bg-card text-card-foreground ring-border hover:bg-muted/50 flex h-full flex-col overflow-hidden rounded-xl ring-1 transition-colors"
    >
      {recipe.imageUrl ? (
        // Unoptimized: photos come from any recipe site, served as they are (no remotePatterns,
        // no image-optimization quota).
        <Image
          src={recipe.imageUrl}
          alt=""
          width={400}
          height={300}
          unoptimized
          className="bg-muted aspect-4/3 h-auto w-full object-cover"
        />
      ) : (
        <ProduceTile
          produce={produceFor(recipe.id)}
          className="font-heading aspect-4/3 items-end p-3 text-5xl leading-none"
        >
          {recipe.title.charAt(0).toUpperCase()}
        </ProduceTile>
      )}

      <div className="flex min-w-0 flex-col gap-1 p-3">
        <span className="font-heading line-clamp-2 leading-snug">
          {recipe.title}
        </span>
        {bookName && (
          <span className="text-muted-foreground truncate text-xs">
            {bookName}
          </span>
        )}
        <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
          {recipe.timeMinutes !== null && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {recipe.timeMinutes} min
            </span>
          )}
          {recipe.yieldServings !== null && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {recipe.yieldServings}
            </span>
          )}
          {recipe.timeMinutes === null &&
            recipe.yieldServings === null &&
            recipe.tags.length > 0 && (
              <span className="truncate">
                {recipe.tags.slice(0, 2).join(" · ")}
              </span>
            )}
        </span>
      </div>
    </Link>
  );
}
