"use client";

import { Button } from "@repo/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import { PageTitle } from "@/app/_components/display";
import { authClient } from "@/app/_lib/auth";
import { followNeon, hasOAuthRequest } from "@/app/_lib/oauth-request";

const EXPIRED = "This sign-in link has expired. Start again from Claude Code.";

// Resumes Claude Code's request for whoever is signed in, and says whether Neon sent the browser on.
async function goOn(): Promise<boolean> {
  const { data, error } = await authClient.oauth2.continue({ selected: true });
  return !error && followNeon(data);
}

// The MCP endpoint's sign-in (docs/build-plan.md KTD22): Neon sends Claude Code's sign-in here.
// Someone already signed in goes straight on; otherwise the form signs in, and the auth client
// sends Neon's signed request with it, so Neon's answer says where to go next. Neon's own sign-in
// view does neither, so this page has its own form.
export function OAuthSignIn() {
  const [view, setView] = useState<"checking" | "form" | "no-request">(
    "checking",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<string>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!hasOAuthRequest()) {
      setView("no-request");
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await authClient.getSession();
      if (cancelled) {
        return;
      }
      if (data?.user && (await goOn())) {
        return;
      }
      if (!cancelled) {
        setFailure(data?.user ? EXPIRED : undefined);
        setView("form");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(undefined);
    startTransition(async () => {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) {
        setFailure("Couldn't sign in with that email and password.");
        return;
      }
      if (!followNeon(data) && !(await goOn())) {
        setFailure(EXPIRED);
      }
    });
  }

  if (view === "checking") {
    return <p className="text-muted-foreground text-sm">Checking…</p>;
  }
  if (view === "no-request") {
    return (
      <p className="text-sm">
        This page signs Claude Code in. Start from Claude Code, which opens it
        with the request to sign in.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <PageTitle>Sign in</PageTitle>
        <p className="text-muted-foreground text-sm">
          Signing Claude Code in to the job search. Sign in with Claude&apos;s
          account, not your own.
        </p>
      </div>
      <FieldGroup>
        <Field data-invalid={failure ? true : undefined}>
          <FieldLabel htmlFor="oauth-email">Email</FieldLabel>
          <Input
            id="oauth-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field data-invalid={failure ? true : undefined}>
          <FieldLabel htmlFor="oauth-password">Password</FieldLabel>
          <Input
            id="oauth-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {failure ? <FieldError>{failure}</FieldError> : null}
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" className="min-h-11" disabled={isPending}>
        Sign in
      </Button>
    </form>
  );
}
