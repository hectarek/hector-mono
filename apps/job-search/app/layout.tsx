import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible_Mono,
  Atkinson_Hyperlegible_Next,
  Saira,
} from "next/font/google";
import { Providers } from "@/app/_providers/providers";
import "./globals.css";

// The Job Search design system's three faces: Atkinson Hyperlegible Next for everything read,
// Saira, set wide through its width axis, for the display layer (labels, codes, titles), and
// Atkinson Hyperlegible Mono for counts, dates and times.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-sans",
  subsets: ["latin"],
});

const saira = Saira({
  variable: "--font-heading",
  subsets: ["latin"],
  axes: ["wdth"],
});

const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// A generic name on every page, signed out included, and never indexed: the app is private
// (docs/build-plan.md R23, KTD17). app/robots.ts asks crawlers to stay out as well. A signed-in
// page's title, "Jobs · Job search", comes from the shell instead (TabTitle in app-nav.tsx).
export const metadata: Metadata = {
  title: "Job search",
  description: "A private job search workspace.",
  robots: { index: false, follow: false },
};

// The browser's bar takes the theme's background in each mode.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="job-search"
      className={`${atkinson.variable} ${saira.variable} ${atkinsonMono.variable} font-sans antialiased`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
