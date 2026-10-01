"use client";

import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent,
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { DeleteRecipeButton } from "@/app/_components/delete-recipe-button";
import { IngredientRows } from "@/app/_components/ingredient-rows";
import { StepRows } from "@/app/_components/step-rows";
import { TagPicker } from "@/app/_components/tag-picker";
import { TopBar } from "@/app/_components/top-bar";
import { addTags } from "@/app/_lib/tag-choices";
import { createRecipe, updateRecipe } from "@/app/actions/recipes";
import type { ActionState } from "@/app/actions/shared";
import {
  emptyLine,
  emptyStep,
  type IngredientRow,
  ingredientInputs,
  type MethodRow,
  stepInputs,
} from "@/src/entities/editor-rows";

export type RecipeFormValues = {
  title: string;
  description: string;
  ingredients: IngredientRow[];
  steps: MethodRow[];
  yieldServings: string;
  timeMinutes: string;
  tags: string[];
  sourceUrl: string;
  imageUrl: string;
};

const EMPTY: RecipeFormValues = {
  title: "",
  description: "",
  ingredients: [],
  steps: [],
  yieldServings: "",
  timeMinutes: "",
  tags: [],
  sourceUrl: "",
  imageUrl: "",
};

// The form's fields in the order they appear (each field's id is its name).
const FIELD_ORDER = [
  "spaceId",
  "title",
  "description",
  "yieldServings",
  "timeMinutes",
  "sourceUrl",
  "imageUrl",
  "ingredients",
  "steps",
  "tags",
] as const;

type Props = {
  // The top bar's title ("New recipe", "Edit recipe"), and a line under it.
  heading: string;
  note?: string;
  // Tags from every book they're in, most-used first, offered as the Tags chips.
  suggestedTags: string[];
} & (
  | {
      mode: "create";
      // The book it goes in: a picker when there's more than one they can edit.
      spaceId: string;
      books: { id: string; name: string }[];
      cancelHref: string;
      // An import's draft to start from (ux-plan P10.1), and what to check in it.
      values?: RecipeFormValues;
      review?: DraftReview;
    }
  | { mode: "edit"; recipeId: string; values: RecipeFormValues }
);

// What the reader wasn't sure of, and the lines whose reading didn't match their words.
export type DraftReview = { unsure: string[]; flagged: string[] };

export function RecipeForm(props: Props) {
  const action = props.mode === "create" ? createRecipe : updateRecipe;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const values = props.values ?? EMPTY;
  const review = props.mode === "create" ? props.review : undefined;
  const [ingredientRows, setIngredientRows] = useState(() =>
    values.ingredients.length ? values.ingredients : [emptyLine()],
  );
  const [stepRows, setStepRows] = useState(() =>
    values.steps.length ? values.steps : [emptyStep()],
  );
  // A problem in the rows, found before sending: its message and the row it's on.
  const [rowProblem, setRowProblem] = useState<{
    field: "ingredients" | "steps";
    problem: string;
    key: string | null;
  } | null>(null);
  const [tags, setTags] = useState(values.tags);
  const [newTag, setNewTag] = useState<string | null>(null);
  const errors = state?.fields ?? {};
  // A server message for a field the form doesn't show still needs saying somewhere.
  const unshownError =
    state?.error && !FIELD_ORDER.some((field) => errors[field]);
  const router = useRouter();
  const formId = useId();
  // Anything typed makes leaving a question: Cancel asks, and closing the tab gets the
  // browser's own prompt. (iOS's back swipe can't be stopped by a page.) An import starts
  // that way: its draft isn't saved anywhere else.
  const [dirty, setDirty] = useState(
    props.mode === "create" && props.values !== undefined,
  );
  const [confirmLeave, setConfirmLeave] = useState(false);

  // The rows' own inputs, to put the cursor in a new row or on a row with a problem.
  const rowInputs = useRef(
    new Map<string, HTMLInputElement | HTMLTextAreaElement>(),
  );
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const rowInputRef =
    (key: string) =>
    (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (element) rowInputs.current.set(key, element);
      else rowInputs.current.delete(key);
    };
  useEffect(() => {
    if (!focusKey) return;
    const element = rowInputs.current.get(focusKey);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "center" });
    setFocusKey(null);
  }, [focusKey]);

  // Changing the rows is typing too: it makes leaving a question.
  function changeIngredients(
    update: (rows: IngredientRow[]) => IngredientRow[],
  ) {
    setIngredientRows(update);
    setDirty(true);
  }
  function changeSteps(update: (rows: MethodRow[]) => MethodRow[]) {
    setStepRows(update);
    setDirty(true);
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // After a failed save, go to the first field with a problem, top to bottom.
  useEffect(() => {
    const first = FIELD_ORDER.find((field) => state?.fields?.[field]);
    const element = first && document.getElementById(first);
    if (element) {
      element.scrollIntoView({ block: "center" });
      element.focus({ preventScroll: true });
    }
  }, [state]);

  function cancel() {
    if (dirty) setConfirmLeave(true);
    else router.push(cancelHref);
  }
  const cancelHref =
    props.mode === "edit" ? `/recipes/${props.recipeId}` : props.cancelHref;

  // Submitting through a transition (not <form action>) keeps what was typed if the save fails;
  // React resets uncontrolled fields after a form action.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ingredients = ingredientInputs(ingredientRows);
    if (ingredients.problem !== null) {
      showRowProblem({ field: "ingredients", ...ingredients });
      return;
    }
    const steps = stepInputs(stepRows);
    if (steps.problem !== null) {
      showRowProblem({ field: "steps", ...steps });
      return;
    }
    setRowProblem(null);

    const formData = new FormData(event.currentTarget);
    formData.set("ingredients", JSON.stringify(ingredients.lines));
    formData.set("steps", JSON.stringify(steps.steps));
    // Including one typed in New tag but not added yet.
    formData.set("tags", addTags(tags, newTag ?? "").join(","));
    startTransition(() => formAction(formData));
  }
  // Return in a one-line field would submit the form (Save is its submit button), saving a
  // recipe mid-edit, so it only closes the phone's keyboard. Save saves.
  function keepTyping(event: KeyboardEvent<HTMLFormElement>) {
    if (
      event.key === "Enter" &&
      !event.defaultPrevented &&
      // Return that confirms an IME's text (Safari: keyCode 229 after compositionend).
      !event.nativeEvent.isComposing &&
      event.nativeEvent.keyCode !== 229 &&
      event.target instanceof HTMLInputElement
    ) {
      event.preventDefault();
      event.target.blur();
    }
  }
  // Says what's wrong under the rows, and puts the cursor on the row (or the list) it's about.
  function showRowProblem(problem: NonNullable<typeof rowProblem>) {
    setRowProblem(problem);
    const element = problem.key
      ? rowInputs.current.get(problem.key)
      : document.getElementById(problem.field);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "center" });
  }
  const ingredientsError =
    rowProblem?.field === "ingredients"
      ? rowProblem.problem
      : errors.ingredients;
  const stepsError =
    rowProblem?.field === "steps" ? rowProblem.problem : errors.steps;

  return (
    <div className="flex flex-col gap-6">
      {/* The bar sits outside the <form> so it stays put past the form's end (Delete is
          below it), and Save points back with form=. */}
      <TopBar
        start={
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={cancel}
            className="-ml-2"
          >
            Cancel
          </Button>
        }
        title={props.heading}
        end={
          <Button type="submit" form={formId} size="lg" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        }
      />
      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard your changes?</DialogTitle>
            <DialogDescription>
              What you&apos;ve typed here won&apos;t be saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" size="lg" type="button" />}
            >
              Keep editing
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              onClick={() => router.push(cancelHref)}
            >
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form
        id={formId}
        onSubmit={handleSubmit}
        onKeyDown={keepTyping}
        onInput={() => setDirty(true)}
        className="flex flex-col gap-6"
      >
        {props.note && (
          <p className="text-muted-foreground -mt-3 text-sm">{props.note}</p>
        )}
        {/* A message not about one field (a failed save, an expired session); field
          messages show under their fields instead. */}
        {unshownError && (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
        {review && (review.flagged.length > 0 || review.unsure.length > 0) && (
          <Alert>
            <AlertTitle>Check before saving</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {/* Two identical lines need saying once, and a key each. */}
                {[...new Set(review.flagged)].map((raw) => (
                  <li key={raw}>
                    &ldquo;{raw}&rdquo; was split from its text: check its
                    amount, unit and name.
                  </li>
                ))}
                {[...new Set(review.unsure)].map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {props.mode === "edit" ? (
          <input type="hidden" name="recipeId" value={props.recipeId} />
        ) : (
          props.books.length < 2 && (
            <input type="hidden" name="spaceId" value={props.spaceId} />
          )
        )}

        <FieldGroup>
          {props.mode === "create" && props.books.length > 1 && (
            <Field data-invalid={!!errors.spaceId}>
              <FieldLabel htmlFor="spaceId">Book</FieldLabel>
              <NativeSelect
                id="spaceId"
                name="spaceId"
                className="w-full"
                aria-invalid={!!errors.spaceId}
                defaultValue={props.spaceId}
              >
                {props.books.map((book) => (
                  <NativeSelectOption key={book.id} value={book.id}>
                    {book.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError>{errors.spaceId}</FieldError>
            </Field>
          )}

          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              aria-invalid={!!errors.title}
              name="title"
              defaultValue={values.title}
              required
            />
            <FieldError>{errors.title}</FieldError>
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Input
              id="description"
              aria-invalid={!!errors.description}
              name="description"
              defaultValue={values.description}
              placeholder="Optional"
            />
            <FieldError>{errors.description}</FieldError>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.yieldServings}>
              <FieldLabel htmlFor="yieldServings">Servings</FieldLabel>
              <Input
                id="yieldServings"
                aria-invalid={!!errors.yieldServings}
                name="yieldServings"
                type="number"
                inputMode="numeric"
                min={1}
                defaultValue={values.yieldServings}
              />
              <FieldError>{errors.yieldServings}</FieldError>
            </Field>
            <Field data-invalid={!!errors.timeMinutes}>
              <FieldLabel htmlFor="timeMinutes">Time (minutes)</FieldLabel>
              <Input
                id="timeMinutes"
                aria-invalid={!!errors.timeMinutes}
                name="timeMinutes"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={values.timeMinutes}
              />
              <FieldError>{errors.timeMinutes}</FieldError>
            </Field>
          </div>

          <Field data-invalid={!!errors.sourceUrl}>
            <FieldLabel htmlFor="sourceUrl">Source link</FieldLabel>
            <Input
              id="sourceUrl"
              aria-invalid={!!errors.sourceUrl}
              name="sourceUrl"
              type="url"
              inputMode="url"
              defaultValue={values.sourceUrl}
              placeholder="https://"
            />
            <FieldError>{errors.sourceUrl}</FieldError>
          </Field>

          <Field data-invalid={!!errors.imageUrl}>
            <FieldLabel htmlFor="imageUrl">Photo link</FieldLabel>
            <Input
              id="imageUrl"
              aria-invalid={!!errors.imageUrl}
              name="imageUrl"
              type="url"
              inputMode="url"
              defaultValue={values.imageUrl}
              placeholder="https://"
            />
            <FieldError>{errors.imageUrl}</FieldError>
          </Field>
        </FieldGroup>

        <FieldSeparator />

        <FieldSet
          id="ingredients"
          tabIndex={-1}
          data-invalid={!!ingredientsError}
        >
          <FieldLegend>Ingredients</FieldLegend>
          <IngredientRows
            rows={ingredientRows}
            onChange={changeIngredients}
            invalidKey={
              rowProblem?.field === "ingredients" ? rowProblem.key : null
            }
            inputRef={rowInputRef}
            focus={setFocusKey}
          />
          <FieldDescription>
            Paste a list into an ingredient to add a row for each line.
          </FieldDescription>
          <FieldError>{ingredientsError}</FieldError>
        </FieldSet>

        <FieldSeparator />

        <FieldSet id="steps" tabIndex={-1} data-invalid={!!stepsError}>
          <FieldLegend>Method</FieldLegend>
          <StepRows
            rows={stepRows}
            onChange={changeSteps}
            invalidKey={rowProblem?.field === "steps" ? rowProblem.key : null}
            inputRef={rowInputRef}
            focus={setFocusKey}
          />
          <FieldDescription>
            Paste numbered steps into a step to add a row for each.
          </FieldDescription>
          <FieldError>{stepsError}</FieldError>
        </FieldSet>

        <FieldSeparator />

        <FieldSet id="tags" tabIndex={-1} data-invalid={!!errors.tags}>
          <FieldLegend variant="label">Tags</FieldLegend>
          <TagPicker
            suggested={props.suggestedTags}
            chosen={tags}
            onChosenChange={(next) => {
              setTags(next);
              // A chip changes the tags without an input event of its own.
              setDirty(true);
            }}
            newTag={newTag}
            onNewTagChange={setNewTag}
          />
          <FieldError>{errors.tags}</FieldError>
        </FieldSet>
      </form>

      {/* Outside the form: the delete dialog has its own form, and a submit inside it
          would otherwise also reach this one (React events bubble through portals). */}
      {props.mode === "edit" && (
        <section className="mt-2 flex flex-col items-start gap-2 border-t pt-6">
          <h2 className="text-base font-semibold">Delete recipe</h2>
          <p className="text-muted-foreground text-sm">
            It&apos;s removed from the book for everyone who shares it.
          </p>
          <DeleteRecipeButton recipeId={props.recipeId} title={values.title} />
        </section>
      )}
    </div>
  );
}
