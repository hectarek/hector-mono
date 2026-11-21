import type { ReactNode } from "react";

// A page's one centered column (KTD14, R43): the phone's full width with 16px sides, and from
// 768px 640 wide (inside its 16px sides, as Wide2 draws it) for a page you read or fill in, or
// 1080 for a list you browse (as wide as the header bar, 24px in from the window's edges below
// that). Its header (AppHeader) comes first, then its groups, 12px apart. Tap targets and type
// sizes don't change with the width.
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
  if (width === "read") {
    return (
      <div className="mx-auto flex w-full max-w-168 flex-col px-4">
        {content}
      </div>
    );
  }
  return (
    <div className="w-full md:px-6">
      <div className="mx-auto flex w-full max-w-270 flex-col px-4 md:px-0">
        {content}
      </div>
    </div>
  );
}
