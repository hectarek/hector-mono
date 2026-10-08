import type { ReactNode } from "react";
import { RoleBadge } from "@/app/_components/role-badge";
import { SpaceMenu } from "@/app/_components/space-menu";
import { SPACE_TYPE_CONTENTS, SPACE_TYPE_LABELS } from "@/app/_lib/space-href";
import type { SpaceRole, SpaceType } from "@/src/entities/models/space.model";

// A book or plan's title with your role, and its ⋯ sheet: Invite (owners), Members, and the
// page's own actions. The label above says what the title names: a book called "Hector's
// Recipes" otherwise reads like the app's name in the header.
export function SpaceHeader({
  space,
  label = SPACE_TYPE_LABELS[space.type],
  action,
  children,
}: {
  space: { id: string; name: string; type: SpaceType; role: SpaceRole };
  // What the page shows of the space, when it isn't the space itself (a plan's grocery list).
  label?: string;
  // The page's main action, beside the title (the library's Add recipe).
  action?: ReactNode;
  // The page's own actions, in the ⋯ sheet after Members.
  children?: ReactNode;
}) {
  return (
    <PageTitle
      label={label}
      title={space.name}
      badge={space.role !== "owner" && <RoleBadge role={space.role} />}
      action={action}
      menu={
        // Keyed by space: Next keeps a page's state across ?book= and ?plan=, and the
        // invite links fetched for one space must never be shared for another.
        <SpaceMenu
          key={space.id}
          space={space}
          contents={SPACE_TYPE_CONTENTS[space.type]}
        >
          {children}
        </SpaceMenu>
      }
    />
  );
}

// A tab's title: a small label naming what it is (and your role, when it isn't yours), the
// title, and beside it the main action and the ⋯ menu (D32, D42).
export function PageTitle({
  label,
  title,
  badge,
  action,
  menu,
}: {
  label: string;
  title: string;
  badge?: ReactNode;
  action?: ReactNode;
  menu?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {label}
          </p>
          {badge}
        </div>
        <h1 className="truncate text-xl font-semibold tracking-tight">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {menu}
      </div>
    </div>
  );
}
