import type { Metadata, Viewport } from "next";
import { Figtree, Young_Serif } from "next/font/google";
import { Providers } from "@/app/_providers/providers";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

// The recipe voice: recipe names, Ingredients / Method headings, step numbers.
const youngSerif = Young_Serif({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hector's Recipes",
  description: "Shared recipe books, a weekly meal plan, and shared groceries.",
  // iOS home-screen app: launches full screen with this name.
  appleWebApp: { capable: true, title: "Recipes", statusBarStyle: "default" },
};

// viewport-fit=cover lets the bottom tab bar sit above the iPhone home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b110e" },
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
      data-theme="recipes"
      className={`${figtree.variable} ${youngSerif.variable} font-sans antialiased`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
