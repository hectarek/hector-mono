"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { inviteTokenFrom } from "@/src/entities/invite-link";

// Joining someone's book or plan from inside the app (ux-plan P23.4): the pasted invite link
// opens the same Join page the link opens in a browser, which asks before joining.
export function JoinLinkForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const link = new FormData(event.currentTarget).get("link");
    const token = inviteTokenFrom(typeof link === "string" ? link : "");
    if (!token) {
      setError("That isn't an invite link. Copy the whole link they sent.");
      return;
    }
    setError(null);
    router.push(`/join/${token}`);
  }

  return (
    // noValidate: the link is checked here, so the message is the app's, not the browser's.
    <form onSubmit={join} noValidate className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          name="link"
          type="url"
          inputMode="url"
          placeholder="Paste an invite link"
          aria-label="Invite link"
          autoComplete="off"
          required
          className="h-9"
        />
        <Button type="submit" variant="secondary" size="lg">
          Join
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
