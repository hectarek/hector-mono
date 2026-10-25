import type { MealShow } from "@/src/entities/meal-days";

// A Meal plan address with the week's filter (`?show=`, docs/ux-plan.md D93) set to `show`:
// every meal is the default, so it leaves the address. The rest of the address stays.
export function withShow(href: string, show: MealShow): string {
  const [path, query = ""] = href.split("?", 2);
  const params = new URLSearchParams(query);
  if (show === "all") params.delete("show");
  else params.set("show", show);
  const rest = params.toString();
  return rest ? `${path}?${rest}` : (path ?? href);
}
