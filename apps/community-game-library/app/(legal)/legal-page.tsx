import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppHeader } from "@/app/_components/app-header";
import { Group } from "@/app/_components/group";
import { PageColumn } from "@/app/_components/page-column";

// Where both pages send questions: the address Hector's own site already gives.
const CONTACT = "hello@hectorfgonzalez.com";

// A link inside the text, drawn as About the catalog draws its sources.
export const TEXT_LINK =
  "font-bold underline decoration-dashed decoration-2 underline-offset-4";

// The privacy policy and the terms of use, in Hector's words (2026-11-23). They open signed out
// (proxy.ts), so Google's consent screen can link to them, and read nothing, so they prerender
// whole. Their way back is the app's home: the welcome page signed out, the Library signed in.
export function LegalPage({
  title,
  updated,
  other,
  children,
}: {
  title: string;
  updated: string;
  // The other page of the two, linked at the foot.
  other: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/", label: "Game Library" }} />}
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl leading-7 font-bold">{title}</h1>
        <p className="font-mono text-xs font-medium text-muted-foreground">
          Last updated {updated}
        </p>
      </div>
      {children}
      <Group label="Questions" overList>
        <LegalText>
          Write to{" "}
          <a href={`mailto:${CONTACT}`} className={TEXT_LINK}>
            {CONTACT}
          </a>
          .
        </LegalText>
      </Group>
      <Button
        variant="link"
        nativeButton={false}
        render={<Link href={other.href} transitionTypes={["go-deeper"]} />}
        className="self-start"
      >
        {other.label}
      </Button>
    </PageColumn>
  );
}

export function LegalText({ children }: { children: ReactNode }) {
  return <p className="text-15 leading-normal">{children}</p>;
}

export function LegalList({ children }: { children: ReactNode }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-15 leading-normal marker:text-muted-foreground">
      {children}
    </ul>
  );
}
