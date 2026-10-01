// The tab bar's icons, drawn for the design system: Lucide's 2px round strokes, each with
// the logo's leaf. The leaf fills in on the active tab.
const ICONS = {
  // A closed cookbook, the leaf on its cover: the same height as the calendar and basket.
  recipes: {
    lines: [
      "M5 18.5v-13A2.5 2.5 0 0 1 7.5 3H18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7.5a2.5 2.5 0 0 1 0-5H19",
    ],
    leaf: "M10.65 11.53A3.92 3.92 0 0 1 15.85 7.47A3.92 3.92 0 0 1 10.65 11.53Z",
  },
  plan: {
    lines: [
      "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
      "M8 3v4",
      "M16 3v4",
      "M3 10h18",
    ],
    leaf: "M9.8 17.43A3.92 3.92 0 0 1 15.0 13.37A3.92 3.92 0 0 1 9.8 17.43Z",
  },
  groceries: {
    lines: [
      "M3.5 9.6h17l-1.5 9.2a2 2 0 0 1-2 1.7H7a2 2 0 0 1-2-1.7z",
      "M9 9.6a3.6 3.6 0 0 1 7.2 0",
      "M9.5 13.4v3.6",
      "M14.5 13.4v3.6",
    ],
    leaf: "M8.2 9.6A3.74 3.74 0 0 1 4.38 4.71A3.74 3.74 0 0 1 8.2 9.6Z",
  },
};

type Tab = keyof typeof ICONS;

export function NavIcon({
  tab,
  active,
  className,
}: {
  tab: Tab;
  active: boolean;
  className?: string;
}) {
  const { lines, leaf } = ICONS[tab];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {lines.map((d) => (
        <path key={d} d={d} />
      ))}
      <path d={leaf} className={active ? "fill-current" : undefined} />
    </svg>
  );
}
