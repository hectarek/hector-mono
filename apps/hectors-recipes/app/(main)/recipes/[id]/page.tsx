import { badgeVariants } from "@repo/ui/components/badge";
import { Clock, ExternalLink, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AddToListButton } from "@/app/_components/add-to-list-button";
import { AddToPlanButton } from "@/app/_components/add-to-plan-button";
import { BackLink } from "@/app/_components/back-link";
import { BookmarkButton } from "@/app/_components/bookmark-button";
import { InlineMarkdown } from "@/app/_components/markdown";
import { ProduceTile, produceFor } from "@/app/_components/produce-tile";
import { RecipeMenu } from "@/app/_components/recipe-menu";
import { CookLink, RecipeServings } from "@/app/_components/recipe-servings";
import { ScaledIngredients } from "@/app/_components/scaled-ingredients";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { libraryHref } from "@/app/_lib/library-href";
import { loadRecipe } from "@/app/_lib/load-recipe";
import { getInjection } from "@/di/container";
import { editableSpaces, hasRole } from "@/src/entities/models/space.model";
import { stepGroups } from "@/src/entities/step-text";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export const dynamic = "force-dynamic";

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { recipe, canEdit } = await loadRecipe(id);
  const userId = await getCurrentUserId();
  const [books, plans, bookmarks] = await Promise.all([
    getInjection("IListMySpacesController")({ type: "recipe-book" }, userId),
    getInjection("IListMySpacesController")({ type: "meal-plan" }, userId),
    getInjection("IGetBookmarksController")(userId),
  ]);
  // A plan's grocery list is part of the plan, so whoever can plan can add to a list. In no
  // plan yet: adding creates their own.
  const planTargets = editableSpaces(plans);
  const canPlan = planTargets.length > 0 || plans.length === 0;
  const inOwnBook = books.some((book) => book.id === recipe.spaceId);
  // Back to the recipe's own book when you're in it; otherwise your default one.
  const libraryBook = inOwnBook ? recipe.spaceId : undefined;
  const copyTargets = books
    .filter(
      (book) => book.id !== recipe.spaceId && hasRole(book.role, "editor"),
    )
    .map(({ id: bookId, name }) => ({ id: bookId, name }));

  return (
    <article data-surface="reading">
      <RecipeServings yieldServings={recipe.yieldServings}>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-2">
            <BackLink
              href={libraryHref({ book: libraryBook })}
              label="Recipes"
            />
            <RecipeMenu
              recipeId={recipe.id}
              title={recipe.title}
              canEdit={canEdit}
              copyTargets={copyTargets}
            />
          </div>

          <header className="flex flex-col gap-3">
            {recipe.imageUrl ? (
              <Image
                src={recipe.imageUrl}
                alt=""
                width={1280}
                height={720}
                unoptimized
                loading="eager"
                className="bg-muted aspect-video h-auto w-full rounded-xl object-cover"
              />
            ) : (
              <ProduceTile
                produce={produceFor(recipe.id)}
                className="font-heading aspect-video items-end rounded-xl p-5 text-8xl leading-none"
              >
                {recipe.title.charAt(0).toUpperCase()}
              </ProduceTile>
            )}
            <div className="flex items-start justify-between gap-2">
              <h1 className="font-heading text-3xl text-balance">
                {recipe.title}
              </h1>
              <BookmarkButton
                recipeId={recipe.id}
                saved={bookmarks.includes(recipe.id)}
              />
            </div>
            {recipe.description && (
              <p className="text-muted-foreground">{recipe.description}</p>
            )}
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
            {/* On a phone Cook takes the row, and the other two share one under it. */}
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <CookLink recipeId={recipe.id} className="col-span-2" />
              {canPlan && (
                <AddToListButton
                  recipeId={recipe.id}
                  title={recipe.title}
                  yieldServings={recipe.yieldServings}
                  plans={planTargets}
                />
              )}
              {canPlan && (
                <AddToPlanButton
                  recipeId={recipe.id}
                  title={recipe.title}
                  today={todayIn(PLAN_TIME_ZONE)}
                  plans={planTargets}
                />
              )}
            </div>
            {recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recipe.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={libraryHref({ book: libraryBook, tag })}
                    className={badgeVariants({ variant: "secondary" })}
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </header>

          <ScaledIngredients lines={recipe.ingredients} />

          {recipe.steps.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-heading text-xl">Method</h2>
              {stepGroups(recipe.steps).map((group) => (
                <div key={group.first} className="flex flex-col gap-3">
                  {group.section && (
                    <h3 className="text-muted-foreground mt-3 text-xs font-semibold tracking-wide uppercase">
                      {group.section}
                    </h3>
                  )}
                  <ol
                    start={group.first}
                    className="marker:font-heading marker:text-primary flex list-decimal flex-col gap-3 pl-7 text-lg marker:text-xl"
                  >
                    {group.steps.map((step) => (
                      <li key={step.position} className="pl-1 leading-relaxed">
                        <InlineMarkdown>{step.text}</InlineMarkdown>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </section>
          )}
        </div>
      </RecipeServings>
    </article>
  );
}
