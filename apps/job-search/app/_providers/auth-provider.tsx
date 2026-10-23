"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { authClient } from "@/app/_lib/auth";

// No sign-up: the app's two accounts exist before first use, and Neon's own setting closes
// it (docs/build-plan.md KTD2). This drops the sign-in form's link to it, and the sign-up
// view sends visitors to sign in.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <NeonAuthUIProvider authClient={authClient} redirectTo="/" signUp={false}>
      {children}
    </NeonAuthUIProvider>
  );
}
