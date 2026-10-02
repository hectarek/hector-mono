// What has the cursor in a screen test, as a person would name it: its label, else its text
// ("the page" when nothing does). Compare this, never the element itself: a failing
// `expect(element).toBe(other)` over a large page was seen to pass in Bun (P15.4).
export function focused(): string {
  const element = document.activeElement;
  if (!element || element === document.body) return "the page";
  return (
    element.getAttribute("aria-label") ??
    element.textContent?.trim() ??
    element.tagName
  );
}
