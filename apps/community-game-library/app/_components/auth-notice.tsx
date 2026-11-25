"use client";

import Link from "next/link";
import { EMAIL_TAKEN_LINE } from "@/app/_lib/auth-localization";
import { useAuthMessage } from "@/app/_lib/auth-notice";

// The line Neon's kit says back, under its form (screens.md, When something goes wrong): an
// email that already has an account says so, with Sign in instead.
export function AuthNotice({ signInHref }: { signInHref: string }) {
  const notice = useAuthMessage();
  if (!notice) return null;
  const taken = notice.message === EMAIL_TAKEN_LINE;
  return (
    <div
      role={notice.variant === "error" ? "alert" : "status"}
      className="flex flex-col items-start gap-1 text-13 font-semibold text-destructive"
    >
      <p>{notice.message}</p>
      {taken && (
        <Link
          href={signInHref}
          className="flex min-h-11 items-center text-15 text-foreground underline decoration-dashed decoration-2 underline-offset-4"
        >
          Sign in instead
        </Link>
      )}
    </div>
  );
}
