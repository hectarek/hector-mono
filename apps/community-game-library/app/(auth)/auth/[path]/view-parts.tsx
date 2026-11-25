import {
  type AuthLocalization,
  authViewPaths,
} from "@neondatabase/auth/react/ui/server";
import type { ReactNode } from "react";
import { LOCALIZATION } from "@/app/_lib/auth-localization";

// A2's line for a sign-up that started from a friend link (A3).
const FROM_A_FRIEND_LINK =
  "You’ll be friends with the person who sent the link.";

function Heading({ title, lines }: { title: string; lines: string[] }) {
  return (
    <>
      <h1 className="text-2xl leading-tight font-bold">{title}</h1>
      {lines.map((line) => (
        <p key={line} className="text-13 leading-snug text-muted-foreground">
          {line}
        </p>
      ))}
    </>
  );
}

// A2's and A8's heading as their boards draw it: the page's h1 at 24px, then 13px lines in
// text-brown. Neon's own title is an 18px div, and its cn takes text-13 for a color, so these
// two views draw their own; every other view keeps Neon's (undefined).
export function authHeading(
  path: string,
  redirectTo: string,
): ReactNode | undefined {
  if (path === authViewPaths.SIGN_UP) {
    return (
      <Heading
        title={LOCALIZATION.SIGN_UP}
        lines={[
          LOCALIZATION.SIGN_UP_DESCRIPTION,
          ...(redirectTo.startsWith("/f/") ? [FROM_A_FRIEND_LINK] : []),
        ]}
      />
    );
  }
  if (path === authViewPaths.SIGN_IN) {
    return <Heading title={LOCALIZATION.SIGN_IN} lines={[]} />;
  }
  return undefined;
}

// Each board's foot is one quiet link, where Neon asks a question before its link: A2's "I
// already have an account" and A8's "Make an account". On these views the two keys name only
// that link (the title is the heading above).
export function authWordsOf(path: string): AuthLocalization | undefined {
  if (path === authViewPaths.SIGN_UP) {
    return {
      ALREADY_HAVE_AN_ACCOUNT: "",
      SIGN_IN: "I already have an account",
    };
  }
  if (path === authViewPaths.SIGN_IN) {
    return { DONT_HAVE_AN_ACCOUNT: "", SIGN_UP: "Make an account" };
  }
  return undefined;
}
