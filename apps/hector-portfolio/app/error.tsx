"use client";

import { Button } from "@repo/ui/components/button";
import { useEffect } from "react";

// biome-ignore lint/suspicious/noShadowRestrictedNames: Next.js error.tsx convention requires this name
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-lg space-y-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
          Error · Something went sideways
        </p>
        <h1 className="font-mono text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">
          That didn&apos;t work
          <span className="text-accent">.</span>
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          An unexpected error came through. Try again, and if it keeps happening
          there&apos;s probably a bug worth telling me about.
        </p>
        {process.env.NODE_ENV === "development" && (
          <details className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
              Error details
            </summary>
            <pre className="mt-3 overflow-auto text-xs">
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button size="label" onClick={reset} variant="default">
            Try again
          </Button>
          <Button
            size="label"
            onClick={() => {
              window.location.href = "/";
            }}
            variant="outline"
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
