import { Toaster } from "@repo/ui/components/sonner";
import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Stardos_Stencil,
} from "next/font/google";
import { APP_TOASTER } from "@/app/_lib/notify";
import "./globals.css";

// Punchboard's three faces (docs/build-plan.md KTD12, the design system's building.md): IBM Plex
// Sans for everything read, Stardos Stencil 700 for titles, labels, stamps and tabs (always
// upper case), and IBM Plex Mono 500 for numbers, facts and counts.
const plexSans = IBM_Plex_Sans({ variable: "--font-sans", subsets: ["latin"] });

const stardosStencil = Stardos_Stencil({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "700",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: "500",
});

export const metadata: Metadata = {
  title: "Community Game Library",
  description: "A private library for a circle of friends' board games.",
};

// The browser's bar is kraft (the design system's Brand), and the page reaches under the
// iPhone's notch and home bar, which the tab bar pads for.
export const viewport: Viewport = {
  themeColor: "#d9bc8c",
  viewportFit: "cover",
};

// The app is light only (D12), so there's no ThemeProvider: the toaster is told it's light,
// rather than following next-themes to the phone's setting. The app's toasts come to it by its
// id (notify.ts).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="community-game-library"
      // Neon's sign-in kit (the sign-in and account layouts) sets next-themes' class and
      // color-scheme on <html> when it loads, which the server's html doesn't carry.
      suppressHydrationWarning
      className={`${plexSans.variable} ${stardosStencil.variable} ${plexMono.variable} font-sans antialiased`}
    >
      <body>
        {children}
        <Toaster
          id={APP_TOASTER}
          theme="light"
          position="bottom-center"
          offset={{ bottom: "var(--toast-bottom)" }}
          mobileOffset={{ bottom: "var(--toast-bottom)", left: 16, right: 16 }}
        />
      </body>
    </html>
  );
}
