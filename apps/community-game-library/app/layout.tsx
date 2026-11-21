import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Community Game Library",
  description: "A private library for a circle of friends' board games.",
};

// No ThemeProvider: the app is light only (docs/build-plan.md KTD12). U2 adds the theme, the
// fonts and the toaster here.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
