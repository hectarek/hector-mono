// One-off import of recipe notes from the Obsidian vault. Reads the vault, never writes to it.
//
//   OBSIDIAN_RECIPES_DIR=<dir> bun scripts/seed-from-obsidian.ts                  # dry run: report only
//   OBSIDIAN_RECIPES_DIR=<dir> bun scripts/seed-from-obsidian.ts --commit --email=<you>
//
// --commit inserts into that account's personal recipe book and skips notes already imported
// (matched on external_ref), so it is safe to re-run.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { ensurePersonalSpaceUseCase } from "@/src/application/use-cases/spaces/ensure-personal-space.use-case";
import {
  parseIngredientLine,
  stripMarkdown,
} from "@/src/entities/ingredient-line";
import { createRecipeSchema } from "@/src/entities/models/recipe.model";
import { toLineWrites } from "@/src/entities/models/recipe-ingredient.model";
import { toStepWrites } from "@/src/entities/models/recipe-step.model";
import { RecipesRepository } from "@/src/infrastructure/repositories/recipes.repository";
import { SpacesRepository } from "@/src/infrastructure/repositories/spaces.repository";
import { ConsoleLoggerService } from "@/src/infrastructure/services/console-logger.service";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";
import {
  type ObsidianRecipe,
  parseObsidianNote,
} from "./lib/parse-obsidian-note";

type Ready = { recipe: ObsidianRecipe; warnings: string[] };
type Skipped = { title: string; reason: string };

function argValue(name: string): string | undefined {
  return process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split("=")[1];
}

async function loadNotes(
  dir: string,
): Promise<{ ready: Ready[]; skipped: Skipped[] }> {
  const files = (await readdir(dir))
    .filter((file) => file.endsWith(".md"))
    .sort();
  const ready: Ready[] = [];
  const skipped: Skipped[] = [];

  for (const file of files) {
    const parsed = parseObsidianNote(
      file,
      await readFile(join(dir, file), "utf8"),
    );
    if (!parsed.ok) {
      skipped.push({ title: parsed.title, reason: parsed.reason });
      continue;
    }

    // Validate exactly as the form would; drop a bad URL rather than lose the whole recipe.
    const warnings: string[] = [];
    const recipe = { ...parsed.recipe };
    for (const field of ["sourceUrl", "imageUrl"] as const) {
      const value = recipe[field];
      if (value && !createRecipeSchema.shape[field].safeParse(value).success) {
        warnings.push(`dropped invalid ${field}`);
        recipe[field] = null;
      }
    }
    ready.push({ recipe, warnings });
  }

  return { ready, skipped };
}

function printReport(ready: Ready[], skipped: Skipped[], mode: string): void {
  const out: string[] = [];
  out.push(`Obsidian import (${mode})`);
  out.push(
    `${ready.length + skipped.length} notes: ${ready.length} importable, ${skipped.length} skipped\n`,
  );

  out.push("Importable");
  for (const { recipe, warnings } of ready) {
    const unparsed = recipe.ingredients.filter(
      (line) => parseIngredientLine(line.raw).quantity === null,
    ).length;
    const meta = [
      `${recipe.ingredients.length} ingredients${unparsed ? ` (${unparsed} without amount)` : ""}`,
      recipe.yieldServings ? `serves ${recipe.yieldServings}` : "no servings",
      recipe.timeMinutes ? `${recipe.timeMinutes} min` : null,
      recipe.instructions ? null : "NO INSTRUCTIONS",
      recipe.tags.join(", ") || "no tags",
      ...warnings,
    ].filter(Boolean);
    out.push(`  ✓ ${recipe.title} — ${meta.join(" · ")}`);
  }

  out.push("\nSkipped (enter these by hand)");
  for (const { title, reason } of skipped) {
    out.push(`  ✗ ${title} — ${reason}`);
  }

  out.push(
    "\nLines with no amount (they import fine; they just won't scale or merge)",
  );
  for (const { recipe } of ready) {
    const lines = recipe.ingredients
      .filter((line) => parseIngredientLine(line.raw).quantity === null)
      .map((line) => stripMarkdown(line.raw));
    if (lines.length) {
      out.push(`  ${recipe.title}: ${lines.join(" | ")}`);
    }
  }

  console.log(out.join("\n"));
}

async function commit(ready: Ready[], email: string): Promise<void> {
  const logger = new ConsoleLoggerService();
  const transactions = new TransactionManagerService(logger);
  const spaces = new SpacesRepository(logger);
  const recipeRepository = new RecipesRepository(logger);

  const users = await db.execute<{ id: string }>(
    sql`select id from neon_auth."user" where lower(email) = lower(${email}) limit 1`,
  );
  const userId = users.rows[0]?.id;
  if (!userId) {
    throw new Error(
      `No account with email ${email}. Sign in to the app once first.`,
    );
  }

  const book = await ensurePersonalSpaceUseCase(
    spaces,
    transactions,
    logger,
  )(userId, "recipe-book");
  const existing = new Set(
    (
      await db
        .select({ ref: recipes.externalRef })
        .from(recipes)
        .where(
          and(eq(recipes.spaceId, book.id), isNotNull(recipes.externalRef)),
        )
    ).map((row) => row.ref),
  );

  let inserted = 0;
  for (const { recipe } of ready) {
    if (existing.has(recipe.externalRef)) continue;

    const { externalRef, ingredients, ...fields } = recipe;
    const input = createRecipeSchema.parse({ ...fields, ingredients });
    await transactions.startTransaction((tx) =>
      recipeRepository.create(
        {
          ...input,
          ingredients: toLineWrites(input.ingredients),
          steps: toStepWrites(recipe.instructions),
          externalRef,
        },
        book.id,
        userId,
        tx,
      ),
    );
    inserted++;
  }

  console.log(
    `\nInserted ${inserted} recipes into "${book.name}"; ${ready.length - inserted} were already there.`,
  );
}

async function main(): Promise<void> {
  const dir = process.env.OBSIDIAN_RECIPES_DIR;
  if (!dir) {
    throw new Error("Set OBSIDIAN_RECIPES_DIR to the vault's recipe folder.");
  }

  const isCommit = process.argv.includes("--commit");
  const { ready, skipped } = await loadNotes(dir);
  printReport(ready, skipped, isCommit ? "COMMIT" : "DRY RUN, nothing written");

  if (isCommit) {
    const email = argValue("email");
    if (!email) {
      throw new Error("--commit needs --email=<the account to import into>");
    }
    await commit(ready, email);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
