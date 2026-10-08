"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  type ActionState,
  actionLogger,
  text,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import { InputParseError } from "@/src/entities/errors/common";

// A validation error about one form field, in the same shape as a Zod error, so the form
// can show it under that field.
function fieldError(field: string, message: string): InputParseError {
  return new InputParseError(message, {
    cause: { issues: [{ path: [field], message }] },
  });
}

function optionalInteger(
  formData: FormData,
  key: string,
  label: string,
  minimum: number,
): number | undefined {
  const value = text(formData, key);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw fieldError(
      key,
      `${label} must be a whole number of at least ${minimum}`,
    );
  }
  return parsed;
}

function tags(formData: FormData): string[] {
  return (text(formData, "tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

// New tags' groups, sent as JSON (checked by the controller).
function tagGroups(formData: FormData): unknown {
  try {
    return JSON.parse(text(formData, "tagGroups") ?? "{}");
  } catch {
    throw fieldError("tags", "Couldn't read the tags' groups. Try again.");
  }
}

// The editor's rows, sent as JSON (checked for shape by the controller).
function rows(formData: FormData, field: "ingredients" | "steps"): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text(formData, field) ?? "[]");
  } catch {
    throw fieldError(field, "Couldn't read these rows. Try again.");
  }
  if (!Array.isArray(parsed)) {
    throw fieldError(field, "Couldn't read these rows. Try again.");
  }
  return parsed;
}

function ingredients(formData: FormData): unknown[] {
  const lines = rows(formData, "ingredients");
  if (!lines.length) {
    throw fieldError("ingredients", "Add at least one ingredient");
  }
  return lines;
}

// Every editable field, always sent: the form is a full replace, so blanks clear values.
function recipeFields(formData: FormData) {
  const title = text(formData, "title");
  if (!title) {
    throw fieldError("title", "Title is required");
  }

  return {
    title,
    description: text(formData, "description") ?? null,
    timeMinutes: optionalInteger(formData, "timeMinutes", "Time", 0) ?? null,
    yieldServings:
      optionalInteger(formData, "yieldServings", "Servings", 1) ?? null,
    tags: tags(formData),
    sourceUrl: text(formData, "sourceUrl") ?? null,
    imageUrl: text(formData, "imageUrl") ?? null,
    ingredients: ingredients(formData),
    steps: rows(formData, "steps"),
  };
}

export async function createRecipe(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const logger = actionLogger("createRecipe");

  let recipeId: string;
  try {
    const userId = await getCurrentUserId();
    const recipe = await getInjection("ICreateRecipeController")(
      {
        spaceId: text(formData, "spaceId"),
        data: recipeFields(formData),
        tagGroups: tagGroups(formData),
      },
      userId,
    );
    recipeId = recipe.id;
  } catch (err) {
    return toActionError(err, logger, "Couldn't save the recipe. Try again.");
  }

  revalidatePath("/");
  redirect(`/recipes/${recipeId}`);
}

export async function updateRecipe(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const logger = actionLogger("updateRecipe");

  const recipeId = text(formData, "recipeId");
  try {
    const userId = await getCurrentUserId();
    await getInjection("IUpdateRecipeController")(
      {
        recipeId,
        data: recipeFields(formData),
        tagGroups: tagGroups(formData),
      },
      userId,
    );
  } catch (err) {
    return toActionError(err, logger, "Couldn't save your changes. Try again.");
  }

  revalidatePath("/");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}

export async function deleteRecipe(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const logger = actionLogger("deleteRecipe");

  let bookId: string;
  try {
    const userId = await getCurrentUserId();
    bookId = await getInjection("IDeleteRecipeController")(
      { recipeId: text(formData, "recipeId") },
      userId,
    );
  } catch (err) {
    return toActionError(err, logger, "Couldn't delete the recipe. Try again.");
  }

  // Back to the book it was in (not the default book, which may be another one).
  revalidatePath("/");
  redirect(`/?book=${bookId}`);
}

// Saves a recipe for this person, or no longer (docs/ux-plan.md D77): the bookmark beside a
// recipe's name. The library puts saved recipes first.
export async function setBookmark(
  recipeId: string,
  saved: boolean,
): Promise<ActionState> {
  try {
    await getInjection("ISetBookmarkController")(
      { recipeId, saved },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("setBookmark"),
      saved ? "Couldn't save that recipe." : "Couldn't unsave that recipe.",
    );
  }
  revalidatePath("/");
  revalidatePath(`/recipes/${recipeId}`);
  return null;
}
