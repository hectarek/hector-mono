// FormData the way a browser would send it; an array value repeats the field.
export function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      data.append(key, item);
    }
  }
  return data;
}
