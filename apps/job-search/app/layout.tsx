import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/app/_providers/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

// A generic name on every page, signed out included, and never indexed: the app is private
// (docs/build-plan.md R23, KTD17). app/robots.ts asks crawlers to stay out as well.
export const metadata: Metadata = {
  title: "Job search",
  description: "A private job search workspace.",
  robots: { index: false, follow: false },
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
      className={`${geistSans.variable} font-sans antialiased`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
