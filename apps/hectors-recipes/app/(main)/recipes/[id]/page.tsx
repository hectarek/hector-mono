import { badgeVariants } from "@repo/ui/components/badge";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { AddToListButton } from "@/app/_components/add-to-list-button";
import { AddToPlanButton } from "@/app/_components/add-to-plan-button";
import { BackLink } from "@/app/_components/back-link";
import { BookmarkButton } from "@/app/_components/bookmark-button";
import { PageMotion } from "@/app/_components/page-motion";
import { RecipeCover } from "@/app/_components/recipe-cover";
import { RecipeFacts } from "@/app/_components/recipe-facts";
import { RecipeMenu } from "@/app/_components/recipe-menu";
import { RecipeMethod } from "@/app/_components/recipe-method";
import { CookLink, RecipeServings } from "@/app/_components/recipe-servings";
import { RememberView } from "@/app/_components/remember-view";
import { ScaledIngredients } from "@/app/_components/scaled-ingredients";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { libraryHref } from "@/app/_lib/library-href";
import { loadRecipe } from "@/app/_lib/load-recipe";
import { type SearchParams, servingsParam } from "@/app/_lib/search-params";
import { getInjection } from "@/di/container";
import { editableSpaces, hasRole } from "@/src/entities/models/space.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  // From cook mode's Done, when its servings were changed; kept in the URL as they change.
  const initialServings = servingsParam((await searchParams).servings);
  const { recipe, canEdit, shareToken, books, plans, bookmarks, today } =
    await loadRecipePage(id);
  // A plan's grocery list is part of the plan, so whoever can plan can add to a list. In no
  // plan yet: adding creates their own.
  const planTargets = editableSpaces(plans);
  const canPlan = planTargets.length > 0 || plans.length === 0;
  const ownBook = books.find((book) => book.id === recipe.spaceId);
  // Back to the recipe's own book when you're in it; otherwise your default one. In two or
  // more books, the link names it (D82).
  const libraryBook = ownBook?.id;
  const backLabel = ownBook && books.length > 1 ? ownBook.name : "Recipes";
  const copyTargets = books
    .filter(
      (book) => book.id !== recipe.spaceId && hasRole(book.role, "editor"),
    )
    .map(({ id: bookId, name }) => ({ id: bookId, name }));

  return (
    <PageMotion>
      <article data-surface="reading">
        <RememberView recipeId={recipe.id} />
        <RecipeServings
          yieldServings={recipe.yieldServings}
          initial={initialServings}
          inUrl
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-2">
              <BackLink
                href={libraryHref({ book: libraryBook })}
                label={backLabel}
              />
              <RecipeMenu
                recipeId={recipe.id}
                title={recipe.title}
                canEdit={canEdit}
                shareToken={shareToken}
                copyTargets={copyTargets}
              />
            </div>

            <header className="flex flex-col gap-3">
              <RecipeCover recipe={recipe} />
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
              <RecipeFacts recipe={recipe} />
              {/* On a phone Cook takes the row, and the other two share one under it, in the
                tab bar's order: Meal plan, then Groceries (P27.2). */}
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <CookLink recipeId={recipe.id} className="col-span-2" />
                {canPlan && (
                  <AddToPlanButton
                    recipeId={recipe.id}
                    title={recipe.title}
                    today={today}
                    plans={planTargets}
                  />
                )}
                {canPlan && (
                  <AddToListButton
                    recipeId={recipe.id}
                    title={recipe.title}
                    yieldServings={recipe.yieldServings}
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

            <RecipeMethod steps={recipe.steps} />
          </div>
        </RecipeServings>
      </article>
    </PageMotion>
  );
}

// D87: kept in the phone's memory for 5 minutes, never on the server, so opening the recipe
// again shows it at once. Any save clears it; someone else's change can take up to 5 minutes
// to show. Everything the page reads is in here, today included (up to 5 minutes behind just
// after midnight): a read outside it would load after the tap.
async function loadRecipePage(recipeId: string) {
  "use cache: private";
  cacheLife({ stale: 300 });

  const userId = await getCurrentUserId();
  const { recipe, canEdit, shareToken } = await loadRecipe(recipeId, userId);
  const [books, plans, bookmarks] = await Promise.all([
    getInjection("IListMySpacesController")({ type: "recipe-book" }, userId),
    getInjection("IListMySpacesController")({ type: "meal-plan" }, userId),
    getInjection("IGetBookmarksController")(userId),
  ]);
  return {
    recipe,
    canEdit,
    shareToken,
    books,
    plans,
    bookmarks,
    today: todayIn(PLAN_TIME_ZONE),
  };
}
