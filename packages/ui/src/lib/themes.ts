// Themes an app selects with data-theme on <html> (the default needs no attribute).
// Each non-default theme is a file in src/styles/themes/ that the app imports.
export type Theme = "default" | "neobrutalist";

// Neobrutalist colours: data-neo="<color>" on the same element as data-theme="neobrutalist"
// Usage: <html data-theme="neobrutalist" data-neo="red">
export type NeoColor =
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

export const neoColors: NeoColor[] = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

// Size variants (shared across themes)
export type ButtonSize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg";

// Card size (shared)
export type CardSize = "default" | "sm";
