"use client";

import { Button } from "@repo/ui/components/button";
import { useEffect, useState, useTransition } from "react";
import { PageTitle } from "@/app/_components/display";
import { authClient } from "@/app/_lib/auth";
import { followNeon } from "@/app/_lib/oauth-request";

// What the consent page shows of Claude Code's request, read from the address Neon signed.
type Request = {
  clientName: string;
  redirectHost: string;
  loopback: boolean;
  scope: string;
  resource: string;
};

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

function hostOf(uri: string): string {
  try {
    return new URL(uri).hostname;
  } catch {
    return uri;
  }
}

// The MCP endpoint's consent page (docs/build-plan.md KTD22): who's asking, where the sign-in goes
// back to, what for, and for which account. Only Claude's account may allow it (R21 as revised);
// the auth route refuses any other, and this page says so before anyone tries.
export function OAuthConsent({
  signedIn,
  isClaude,
}: {
  signedIn: boolean;
  isClaude: boolean;
}) {
  const [request, setRequest] = useState<Request>();
  const [failure, setFailure] = useState<string>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isClaude) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("client_id") ?? "";
    const redirectHost = hostOf(params.get("redirect_uri") ?? "");
    let cancelled = false;
    void (async () => {
      const { data } = await authClient.oauth2.publicClient({
        query: { client_id: clientId },
      });
      if (cancelled) {
        return;
      }
      setRequest({
        clientName: data?.client_name ?? clientId,
        redirectHost,
        loopback: LOOPBACK.has(redirectHost),
        scope: params.get("scope") ?? "",
        resource: params.get("resource") ?? "",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isClaude]);

  function respond(accept: boolean) {
    setFailure(undefined);
    startTransition(async () => {
      const { data, error } = await authClient.oauth2.consent({ accept });
      if (error || !followNeon(data)) {
        setFailure(
          "Couldn't answer the request. Start again from Claude Code.",
        );
      }
    });
  }

  if (!signedIn) {
    return (
      <p className="text-sm">
        Sign in first: start again from Claude Code, which opens the sign-in.
      </p>
    );
  }
  if (!isClaude) {
    return (
      <p className="text-sm">
        Only Claude&apos;s account can allow access to the MCP endpoint, and
        you&apos;re signed in with another one. Start again from Claude Code in
        a private window, and sign in with Claude&apos;s account.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <PageTitle>Allow access</PageTitle>
        <p className="text-muted-foreground text-sm">
          {request?.clientName ?? "An app"} asks to use the job search&apos;s
          tools as Claude&apos;s account, the one signed in.
        </p>
      </div>
      {request ? (
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="font-medium">Sends the sign-in back to</dt>
            <dd className="text-muted-foreground break-words">
              {request.redirectHost}
              {request.loopback
                ? ": this computer, so the app asking runs here. Its name alone doesn't prove who made it."
                : null}
            </dd>
          </div>
          <div>
            <dt className="font-medium">For</dt>
            <dd className="text-muted-foreground break-words">
              {request.resource}
            </dd>
          </div>
          <div>
            <dt className="font-medium">Asks for</dt>
            <dd className="text-muted-foreground break-words">
              {request.scope}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-muted-foreground text-sm">Reading the request…</p>
      )}
      {failure ? <p className="text-destructive text-sm">{failure}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="lg"
          className="min-h-11"
          disabled={isPending || !request}
          onClick={() => respond(true)}
        >
          Allow
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="min-h-11"
          disabled={isPending}
          onClick={() => respond(false)}
        >
          Deny
        </Button>
      </div>
    </div>
  );
}
