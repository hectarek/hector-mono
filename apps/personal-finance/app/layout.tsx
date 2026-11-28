import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { PageTitle } from "./_components/page-title";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

// A placeholder face until the chosen look sets the app's fonts (the plan's U9).
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Fallback for routes without their own metadata (404, error). No title, since the shell renders
// it, and no URLs: a canonical or og:url here would be inherited as the home page's.
export const metadata: Metadata = {
  description:
    "Money, explained in plain words, with tools to try the numbers.",
};

// Every page is prerendered: anything that would render per request fails the build.
export const ensureStatic = "navigation";

// Light only until the look is chosen (H3): there's no ThemeProvider, so dark tokens never apply.
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} font-sans antialiased`}>
      <body className="flex min-h-dvh flex-col bg-background text-lg text-foreground">
        <PageTitle />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-20 focus:rounded-md focus:bg-background focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        {/* Vercel serves the script, and turbo.json passes VERCEL_ENV to the build (KTD14). */}
        {process.env["VERCEL_ENV"] && <Analytics />}
      </body>
    </html>
  );
}
