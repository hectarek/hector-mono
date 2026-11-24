import type { Metadata } from "next";
import { Group } from "@/app/_components/group";
import {
  LegalList,
  LegalPage,
  LegalText,
  TEXT_LINK,
} from "@/app/(legal)/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy · Community Game Library",
};

// The privacy policy describes the app as built: a change to what it keeps, who sees it or the
// services it runs on changes this page, and its date.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="November 24, 2026"
      other={{ href: "/terms", label: "Terms of use" }}
    >
      <LegalText>
        Community Game Library is a small, private app for a circle of friends
        to keep track of their board games, lend them to each other and plan
        game nights. Hector Gonzalez runs it as a personal project. It’s free,
        it has no ads, and it never sells or rents your information.
      </LegalText>

      <Group label="What the app keeps" overList>
        <LegalList>
          <li>
            <strong>Your account.</strong> Your name and email address. If you
            sign in with Google, Google tells the app your name, email address
            and profile picture. If you sign up with an email address, the app
            keeps a protected form of your password (a hash), never the password
            itself.
          </li>
          <li>
            <strong>Your profile.</strong> The name you show, your playing
            piece, and a phone number and a photo if you add them.
          </li>
          <li>
            <strong>Your games.</strong> The games on your shelf, notes on their
            condition, and whether you lend them.
          </li>
          <li>
            <strong>Loans.</strong> Who asked to borrow what, the answers and
            notes, pick-up and due dates, and returns.
          </li>
          <li>
            <strong>Friends.</strong> Who your friends are, friend requests, and
            your friend link while it lasts (7 days).
          </li>
          <li>
            <strong>Game nights.</strong> The nights you host or are invited to:
            the time, the place and an address if the host adds one, who’s
            going, how many guests they bring, the games on the table and the
            votes.
          </li>
          <li>
            <strong>Suggestions.</strong> Games you suggest for the catalog,
            with a photo if you add one.
          </li>
          <li>
            <strong>Notices and settings.</strong> Your inbox, and which notices
            you get.
          </li>
        </LegalList>
      </Group>

      <Group label="Who sees it" overList>
        <LegalList>
          <li>
            <strong>Your friends</strong> see your profile, including your phone
            number and photo, the games on your shelf, and the nights you share
            with them.
          </li>
          <li>
            <strong>The other person in a loan</strong> sees your name, phone
            number and photo, even if you aren’t friends.
          </li>
          <li>
            <strong>Your name and piece</strong> also show to people in the same
            loan line or at the same night as you, and to friends of your
            friends under People you may know.
          </li>
          <li>
            <strong>A night’s link</strong> shows its title, time and seats to
            whoever has it, but never its place.
          </li>
          <li>
            <strong>The admin</strong>, Hector, runs the catalog, answers
            suggestions, and can remove an account that misuses the app. As the
            person who runs the app, he can also reach its database to keep it
            working.
          </li>
          <li>
            <strong>Photos.</strong> Profile photos are private: the app shows
            them only to the people above, through links that stop working after
            an hour. Game photos added to the catalog are public, so anyone with
            a photo’s address can open it.
          </li>
        </LegalList>
      </Group>

      <Group label="The services the app runs on" overList>
        <LegalText>
          These services handle your information only to run the app:
        </LegalText>
        <LegalList>
          <li>
            <strong>Neon</strong> stores the database, the sign-ins and the
            photos in the United States (AWS US East, in Virginia), and sends
            sign-up codes and password-reset emails.
          </li>
          <li>
            <strong>Vercel</strong> hosts the app.
          </li>
          <li>
            <strong>Google</strong> handles Sign in with Google, if you use it.
          </li>
        </LegalList>
      </Group>

      <Group label="Google sign-in" overList>
        <LegalText>
          If you sign in with Google, the app receives your name, email address
          and profile picture. It uses them only to sign you in and fill in your
          profile, where your Google picture becomes your starting photo, which
          you can change or remove. The app asks Google for nothing else and
          shares nothing it receives. Community Game Library’s use of
          information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
            className={TEXT_LINK}
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </LegalText>
      </Group>

      <Group label="Cookies and your phone" overList>
        <LegalText>
          The app uses cookies only to keep you signed in. It has no analytics,
          advertising or tracking. On your phone it saves copies of the pages
          you open, so they show at once, and signing out deletes them.
        </LegalText>
      </Group>

      <Group label="Deleting your account" overList>
        <LegalText>
          You can delete your account from You, under Delete my account, once no
          loan of yours is still open. That deletes your profile, photo, games,
          friendships, requests, settings and inbox. Your sign-in keeps no name,
          email or picture, and can’t be used to sign in again. What other
          people still need stays, with your name shown as “A former member”:
          past loans of their games, notices they got, and past nights you
          hosted.
        </LegalText>
      </Group>

      <Group label="Children" overList>
        <LegalText>The app isn’t meant for anyone under 13.</LegalText>
      </Group>

      <Group label="Changes" overList>
        <LegalText>
          If this policy changes, the new version goes on this page with a new
          date.
        </LegalText>
      </Group>
    </LegalPage>
  );
}
