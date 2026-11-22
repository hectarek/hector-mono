import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

// The design system's line icons (its assets/Icons), drawn inline so they take their text's
// color. Only these, and only where one is listed for the job. Most are 20px with a 2px stroke;
// back and close in a header or a sheet are 22px with a 2.4 stroke.
// An icon before a button's label carries data-icon="inline-start", as shadcn's do.
type IconProps = {
  className?: string;
  strokeWidth?: number;
  "data-icon"?: "inline-start";
};

function LineIcon({
  className,
  strokeWidth = 2,
  viewBox = "0 0 24 24",
  roundCaps = true,
  children,
  ...rest
}: IconProps & { viewBox?: string; roundCaps?: boolean; children: ReactNode }) {
  return (
    <svg
      {...rest}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap={roundCaps ? "round" : undefined}
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-5 shrink-0", className)}
    >
      {children}
    </svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M15 5l-7 7 7 7" />
    </LineIcon>
  );
}

export function ForwardIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M9 5l7 7-7 7" />
    </LineIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </LineIcon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </LineIcon>
  );
}

// The Library tab's: round joins, no round caps.
export function LibraryIcon(props: IconProps) {
  return (
    <LineIcon {...props} roundCaps={false}>
      <path d="M4 5h16v5H4zM6 10h12v4H6zM3 14h18v5H3z" />
    </LineIcon>
  );
}

// A date; the Nights tab.
export function CalendarIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="1.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </LineIcon>
  );
}

export function LoansIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 8.5h15l-3.5-3.5M20 15.5H5l3.5 3.5" />
    </LineIcon>
  );
}

// The Friends tab's: the Pawn's outline, 16 by 22.
export function FriendsIcon({ className }: { className?: string }) {
  return (
    <LineIcon
      viewBox="0 0 22 32"
      strokeWidth={2.6}
      roundCaps={false}
      className={cn("h-5.5 w-4", className)}
    >
      <path d="M11 1a6 6 0 0 1 4.2 10.3L20 27.5a2.5 2.5 0 0 1-2.4 3.2H4.4A2.5 2.5 0 0 1 2 27.5l4.8-16.2A6 6 0 0 1 11 1z" />
    </LineIcon>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 8h3.5l1.5-2.5h6L16.5 8H20v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </LineIcon>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M6 3.5h4l1.5 4.5-2.2 1.6a12 12 0 0 0 5.1 5.1l1.6-2.2 4.5 1.5v4a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 5.7 2 2 0 0 1 6 3.5z" />
    </LineIcon>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M14 5H6v14h8M11 12h9M17 9l3 3-3 3" />
    </LineIcon>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <LineIcon {...props}>
      <path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" />
    </LineIcon>
  );
}

// A search field's mark: 16px.
export function SearchIcon({ className }: { className?: string }) {
  return (
    <LineIcon viewBox="0 0 16 16" className={cn("size-4", className)}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </LineIcon>
  );
}
