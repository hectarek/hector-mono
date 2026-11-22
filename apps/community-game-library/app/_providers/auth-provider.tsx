"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { authClient } from "@/app/_lib/auth";
import { LOCALIZATION } from "@/app/_lib/auth-localization";
import { showAuthMessage, toAuthMessage } from "@/app/_lib/auth-notice";

// Neon's sign-in kit loads only on the pages that draw its views (KTD2). Google is on, with the
// code check on email sign-up from Neon's own setting (KTD3).
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      defaultTheme="light"
      redirectTo="/"
      social={{ providers: ["google"] }}
      emailVerification={{ otp: true }}
      localization={LOCALIZATION}
      toast={(toast) => showAuthMessage(toAuthMessage(toast))}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
