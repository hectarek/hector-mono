import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { Button } from "@repo/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/app/_components/logo";
import { RecipeCover } from "@/app/_components/recipe-cover";
import { RecipeFacts } from "@/app/_components/recipe-facts";
import { RecipeMethod } from "@/app/_components/recipe-method";
import { RecipeServings } from "@/app/_components/recipe-servings";
import { ScaledIngredients } from "@/app/_components/scaled-ingredients";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { type SearchParams, servingsParam } from "@/app/_lib/search-params";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";

// Whoever has the link can see it; search engines are asked to leave it out.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// A recipe's view-only public link (docs/ux-plan.md D98, D99), for someone who isn't signed
// in: the recipe to read, with its servings to change, and no actions but Create account and
// Sign in, which bring them back here. Signed in, it's the recipe's own page (F18).
export default async function SharedRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: SearchParams;
}) {
  // The session first: it ends the prerender, as on every page (AGENTS.md, Cache Components).
  const userId = await getCurrentUserId();
  const { token } = await params;
  const recipe = await loadSharedRecipe(token);
  const initialServings = servingsParam((await searchParams).servings);
  if (userId) {
    redirect(
      initialServings
        ? `/recipes/${recipe.id}?servings=${initialServings}`
        : `/recipes/${recipe.id}`,
    );
  }
  const backHere = `?${new URLSearchParams({ redirectTo: `/shared/${token}` })}`;

  return (
    <main className="pt-safe-6 pb-safe-6 mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4">
      <Logo className="h-5 w-auto self-start" />
      <article data-surface="reading">
        <RecipeServings
          yieldServings={recipe.yieldServings}
          initial={initialServings}
          inUrl
        >
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-3">
              <RecipeCover recipe={recipe} />
              <h1 className="font-heading text-3xl text-balance">
                {recipe.title}
              </h1>
              {recipe.description && (
                <p className="text-muted-foreground">{recipe.description}</p>
              )}
              <RecipeFacts recipe={recipe} />
            </header>
            <ScaledIngredients lines={recipe.ingredients} />
            <RecipeMethod steps={recipe.steps} />
          </div>
        </RecipeServings>
      </article>

      <section
        aria-label="Hector's Recipes"
        className="flex flex-col gap-3 rounded-xl border p-4"
      >
        <p className="text-balance">
          Shared from Hector&apos;s Recipes. With an account you can keep
          recipes, plan your week&apos;s meals and share groceries.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href={`/auth/${authViewPaths.SIGN_UP}${backHere}`} />}
          >
            Create account
          </Button>
          <Button
            size="lg"
            variant="secondary"
            nativeButton={false}
            render={<Link href={`/auth/${authViewPaths.SIGN_IN}${backHere}`} />}
          >
            Sign in
          </Button>
        </div>
      </section>
    </main>
  );
}

// A link that's off, never was, or isn't one shows Not found.
async function loadSharedRecipe(token: string) {
  try {
    return await getInjection("IGetSharedRecipeController")({ token });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    throw err;
  }
}
