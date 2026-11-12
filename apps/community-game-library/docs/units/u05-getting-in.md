# U5. Getting in, and You

| | |
|---|---|
| Batch | 1, Foundation (`feat/community-game-library-b1-foundation`) |
| Model | Standard: it follows recipes' sign-in |
| After | U2, U4 |
| Serves | R39, R40, R51, R43 (A6); KTD3, KTD11 |

A visitor makes an account with Google or email, signs in, sets up their profile and piece, and sees You. A link opened inside a chat app's browser asks to be opened in the phone's browser, and a removed account sees only that it was removed.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `A1-Welcome`, `A2-SignUp`, `A8-SignIn`, `A9-OpenInBrowser`, `A4-ProfileSetup`, `A6-Install`, `E5-You`, `E6-EditProfile`.
- Recipes' `app/(auth)/welcome/`, `app/(auth)/auth/[path]/page.tsx` and its `layout.tsx`, `app/(main)/account/`, `proxy.ts`, and its Auth Rules.
- Neon's docs: `neon.com/docs/auth/guides/email-verification` (verification by code) and `neon.com/docs/auth/guides/setup-oauth` (Google in development).
- [screens.md](../screens.md), When something goes wrong: a link opened inside a chat app's browser, an email that already has an account, a photo that's too large.
- [build-plan.md](../build-plan.md): R39, R40, R51; KTD3, KTD11.

## Build

1. **Getting in.** Welcome (A1) at `/welcome`. Make an account (A2) and Sign in (A8) through Neon's `AuthView` at `/auth/[path]`, restyled through `classNames` and `localization` with the boards' words, offering Google and email with a verification code. Neon's provider sits only in `(auth)/auth/layout.tsx` and `account/layout.tsx` (KTD2), and `account/[path]` holds Neon's account views.
2. **A9.** `src/entities/in-app-browser.ts`, with a list of chat apps' in-app browsers checked against their published user agents, each with a test. Welcome shows A9 when one matches.
3. **The gate after sign-in**, in one helper the `(main)` layout and `(start)` pages use: no `user_profiles` row goes to `/start/profile`, a `removed_users` row goes to `/removed`, and anyone else gets the app. `/removed` says the account was removed and offers Sign out. No board draws it; keep it to those two things.
4. **Setting up (A4, then A6).** `/start/profile` is A4: the name, prefilled from Neon Auth's; a photo, optional, through the photo field; a phone, optional; and the piece's shape and color, with "Taken by your friends" when there are any (only after a friend link, from U10). It writes the profile and the settings row. Step 2 (A5) comes with U10: until then, Next goes to `/start/home-screen`, which is A6 (iPhone's and Android's steps), and Done goes to the Library.
5. **You (E5) and Edit profile (E6).** E5 shows the member's photo, piece, name and phone, with Edit profile and Sign out. Later units add their own rows: Notices I get (U11), Admin for the admin (U9), Delete my account (U22) and About the catalog (U24). E6 edits A4's fields with the same form (`profile-form`), following E6's board on what saves at once.
6. **Use cases:** `create-profile`, `update-profile`, `get-profile` (with the photo's signed address for someone who may see it), `set-photo` (the shrunk picture into `profile-photos`, its key in `photo_key`, the old picture removed) and `remove-photo`.
7. **The header's piece** button now shows the member's own piece.

## Not in this unit

Friend links, A3 and A5 (U10). The inbox and Notices I get (U11). Deleting an account (U22). The manifest and install prompt (U23).

## Tests

- The proxy lets `/welcome` and `/auth/*` through signed out.
- `in-app-browser.ts`: each listed browser matches, and Safari and Chrome don't.
- The gate sends a member with no profile to `/start/profile` and a removed one to `/removed`.
- `create-profile` needs a name and takes only the listed shapes and colors; `set-photo` stores the key and removes the old picture.
- Neon's "email already in use" answer shows "That email already has an account." with "Sign in instead".
- Screens: A4 picks a piece and saves; E5's rows; E6 saves.

## Done when

- [ ] On the test project, an account is made with email (by code) and with Google, signs in, sets up a profile and reaches You
- [ ] A1, A2, A8, A9, A4, A6, E5 and E6 match their boards at 390 px, and work at 768 and 1280 px
- [ ] A9 shows for a chat app's user agent
- [ ] The checks, dead code and tests pass
- [ ] The app's `AGENTS.md` Auth Rules are updated
- [ ] Committed as `feat(community-game-library): U5 getting in, and You`
- [ ] Batch 1 is pushed and its PR opened, opening with the migration its merge needs; the preview is ready for Hector's gate (H8). A preview signs in only at its branch alias, once the test project trusts that alias.
