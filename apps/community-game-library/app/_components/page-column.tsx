import { type ReactNode, ViewTransition } from "react";

// How a page moves in and out (U26, recipes' D89): the link tapped names the move with its
// `transitionTypes`, "go-deeper" into a page with a back link and "go-back" by the back link;
// anything else (a tab, the browser's Back, a save, a refresh) moves nothing. A skeleton moves as
// its page would, and the page that replaces it doesn't move again. The classes are styled in
// app/globals.css.
const SLIDES = {
  "go-deeper": "go-deeper",
  "go-back": "go-back",
  default: "none",
};

// A page's one centered column (KTD14, R43): the phone's full width with 16px sides, and from
// 768px 640 wide (inside its 16px sides, as Wide2 draws it) for a page you read or fill in, or
// 1080 for a list you browse (as wide as the header bar, 24px in from the window's edges below
// that). Its header (AppHeader) comes first, then its groups, 12px apart. Tap targets and type
// sizes don't change with the width. Every page and skeleton is in one, so it's where a page
// comes in and goes out: a layout stays put.
export function PageColumn({
  width,
  header,
  children,
}: {
  width: "read" | "browse";
  header: ReactNode;
  children?: ReactNode;
}) {
  const content = (
    <>
      {header}
      <div className="flex flex-col gap-3 pb-6">{children}</div>
    </>
  );
  return (
    <ViewTransition enter={SLIDES} exit={SLIDES} default="none">
      {width === "read" ? (
        <div className="mx-auto flex w-full max-w-168 flex-col px-4">
          {content}
        </div>
      ) : (
        <div className="w-full md:px-6">
          <div className="mx-auto flex w-full max-w-270 flex-col px-4 md:px-0">
            {content}
          </div>
        </div>
      )}
    </ViewTransition>
  );
}
