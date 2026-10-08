import { type ReactNode, ViewTransition } from "react";

// A recipe's picture, its photo or produce tile, on its card and on its page (D89). The two
// share a name, so the card's grows into the page's. It plays only when the recipe page is
// there at the tap (opened in the last 5 minutes, D87); otherwise the page fades up.
// `app/globals.css` styles `.grow`.
export function RecipePicture({
  recipeId,
  children,
}: {
  recipeId: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition
      name={`recipe-picture-${recipeId}`}
      share="grow"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
