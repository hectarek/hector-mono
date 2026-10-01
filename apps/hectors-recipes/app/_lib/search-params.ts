export type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

// One trimmed value for a query parameter, or undefined when it's missing or blank.
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  const single = Array.isArray(value) ? value[0] : value;
  return single?.trim() || undefined;
}

// ?servings= for scaling a recipe: a whole number from 1 to 100 (the same bounds as adding
// to a list), or undefined for anything else.
export function servingsParam(
  value: string | string[] | undefined,
): number | undefined {
  const text = firstParam(value);
  if (!text || !/^\d+$/.test(text)) {
    return undefined;
  }
  const servings = Number(text);
  return servings >= 1 && servings <= 100 ? servings : undefined;
}
