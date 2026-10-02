import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import { cn } from "@/app/_lib/utils";
import "@/app/globals.css";
import { Providers } from "@/app/_providers/providers";

const fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: "300",
});

export const viewport: Viewport = {
  initialScale: 1,
  width: "device-width",
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Relationship Meter",
  description:
    "Track the strength of your relationships with research-based models of how ties fade without contact and grow with each interaction.",
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
      data-theme="neobrutalist"
      data-neo="blue"
      className={cn(
        "h-full font-sans antialiased",
        fontSans.variable,
        fontMono.variable,
      )}
    >
      <body
        suppressHydrationWarning
        className="w-full overflow-x-hidden h-svh bg-background"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
