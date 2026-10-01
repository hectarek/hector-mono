"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type * as React from "react";

// shadcn's Next.js dark-mode provider. Apps use this and the useTheme below, not
// next-themes directly: next-themes defaults to attribute="data-theme", which is the
// brand-theme selector here (see styles/globals.css), and one import site keeps every
// app on the same next-themes copy as its provider. Dark mode is the `dark` class.
function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export { ThemeProvider, useTheme };
