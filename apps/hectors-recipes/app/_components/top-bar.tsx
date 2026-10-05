import type { ReactNode } from "react";

// The top bar of a full-screen (form) page, which has no header or tab bar: the way out at
// the start, the title in the middle, the page's action at the end. It stays in reach however
// long the page is. The sides share what the title leaves equally, so it stays centred and a
// longer title ("Add by photo or file") isn't cut to a third of the width.
export function TopBar({
  start,
  title,
  end,
}: {
  start: ReactNode;
  title: string;
  end?: ReactNode;
}) {
  return (
    <div className="bg-background/95 supports-backdrop-filter:bg-background/80 pt-safe-2 sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b px-4 pb-2 backdrop-blur">
      <div className="flex flex-1 basis-0 justify-start">{start}</div>
      <h1 className="min-w-0 truncate text-center font-semibold">{title}</h1>
      <div className="flex flex-1 basis-0 justify-end">{end}</div>
    </div>
  );
}
