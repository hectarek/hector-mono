import type { Metadata } from "next";
import {
  Caveat,
  Geist,
  IBM_Plex_Mono,
  Instrument_Serif,
} from "next/font/google";
import "./globals.css";
import { getProfile } from "@/src/lib/data";
import { Footer } from "./_components/portfolio/contact/footer";
import { Navbar } from "./_components/portfolio/nav/navbar";
import { Providers } from "./_providers/providers";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

// Fallback for routes without their own metadata (404, error). No URLs here: a
// canonical or og:url in the root layout would be inherited as the home page's.
export const metadata: Metadata = {
  title:
    "Hector Gonzalez | Full-Stack Engineer, Co-Founder, Applied AI Builder",
  description:
    "Product-minded full-stack engineer building learning systems, internal tools, and applied AI. Co-founder & CTO at Stiegler EdTech.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = getProfile();

  return (
    <html
      lang="en"
      data-theme="portfolio"
      suppressHydrationWarning
      className="h-full"
    >
      <body
        className={`${geistSans.variable} ${plexMono.variable} ${instrumentSerif.variable} ${caveat.variable} bg-background text-foreground antialiased flex min-h-screen flex-col font-sans selection:bg-accent/20 selection:text-foreground`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:outline focus:outline-2 focus:outline-accent"
        >
          Skip to content
        </a>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main id="main" className="flex flex-1 flex-col">
              {children}
            </main>
            <Footer profile={profile} />
          </div>
        </Providers>
      </body>
    </html>
  );
}
