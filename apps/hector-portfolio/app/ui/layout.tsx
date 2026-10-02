import { TooltipProvider } from "@repo/ui/components/tooltip";
// Only the gallery's theme switcher uses it, so it ships with this route, not every page.
import "@repo/ui/styles/themes/neobrutalist.css";
import type { Metadata } from "next";
import { generateSEOMetadata } from "@/src/shared/utils/seo";

// The gallery page is a client component, so its metadata lives here.
export const metadata: Metadata = generateSEOMetadata({
  title: "UI components | Hector Gonzalez",
  description:
    "Gallery of the shared @repo/ui components across themes. A working page, not part of the portfolio.",
  path: "/ui",
  noIndex: true,
});

export default function UiLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The gallery is the only page with tooltips, so the provider lives here.
  return <TooltipProvider>{children}</TooltipProvider>;
}
