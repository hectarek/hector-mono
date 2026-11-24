import type { Metadata } from "next";
import Link from "next/link";
import { Group } from "@/app/_components/group";
import {
  LegalList,
  LegalPage,
  LegalText,
  TEXT_LINK,
} from "@/app/(legal)/legal-page";

export const metadata: Metadata = {
  title: "Terms of use · Community Game Library",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="November 23, 2026"
      other={{ href: "/privacy", label: "Privacy policy" }}
    >
      <LegalText>
        Community Game Library is a free, private app for a circle of friends to
        share board games and plan game nights. Hector Gonzalez runs it as a
        personal project. By using it, you agree to these terms.
      </LegalText>

      <Group label="Who can use it" overList>
        <LegalList>
          <li>You’re 13 or older, and a member invited you.</li>
          <li>One account per person, under your own name.</li>
          <li>
            Keep your sign-in to yourself. You’re responsible for what happens
            on your account.
          </li>
        </LegalList>
      </Group>

      <Group label="What you add" overList>
        <LegalList>
          <li>
            What you add stays yours: your photos, notes and messages. You let
            the app store them and show them to the people the{" "}
            <Link href="/privacy" className={TEXT_LINK}>
              privacy policy
            </Link>{" "}
            describes.
          </li>
          <li>
            Add only what you have the right to share, and nothing illegal,
            hateful or meant to harass.
          </li>
        </LegalList>
      </Group>

      <Group label="Lending and game nights" overList>
        <LegalList>
          <li>
            The app keeps track of loans; it isn’t part of them. Lending is
            between you and your friends.
          </li>
          <li>
            Agree with each other about care, lateness, and lost or broken
            games. The app isn’t responsible for any of it, or for what happens
            at a game night.
          </li>
        </LegalList>
      </Group>

      <Group label="The catalog" overList>
        <LegalText>
          Game facts come from Wikidata and Wikipedia and may be wrong or
          missing. Suggest a fix in the app.
        </LegalText>
      </Group>

      <Group label="Using it fairly" overList>
        <LegalList>
          <li>
            Don’t try to get into other people’s accounts or information, break
            the app, or overload it.
          </li>
          <li>
            The admin can remove an account that breaks these terms. You can
            delete yours at any time.
          </li>
        </LegalList>
      </Group>

      <Group label="The service" overList>
        <LegalList>
          <li>
            The app comes as it is, without guarantees. It may change, pause or
            end.
          </li>
          <li>
            As far as the law allows, Hector isn’t liable for losses from using
            it.
          </li>
        </LegalList>
      </Group>

      <Group label="Changes" overList>
        <LegalText>
          New terms go on this page with a new date. Using the app after a
          change means you accept it.
        </LegalText>
      </Group>
    </LegalPage>
  );
}
