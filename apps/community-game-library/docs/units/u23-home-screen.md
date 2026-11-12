# U23. The home screen, saved copies and link previews

| | |
|---|---|
| Batch | 6, Accounts and the phone (`feat/community-game-library-b6-accounts`) |
| Model | Strong: the service worker decides what the phone shows after a day away |
| After | Batches 4 and 5 merged. Build it after U22, so the batch's branch stays linear |
| Serves | R43, R44; KTD2, KTD19 |

The app installs to the home screen with its Three pieces icon, opens a page from the phone's saved copy at once, and its links show a preview in a chat.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `Y2-IconAndName` (the icon, the name and the link preview), `A6-Install`.
- The design system: `assets/Brand/README.md` and `assets/Brand/icon.svg`.
- `docs/fast-first-open.md`, pattern 6 and the checklist.
- Recipes' `service-worker/` (`rules.ts`, `handlers.ts`, `worker.ts`), `scripts/build-service-worker.ts`, `app/_components/saved-copy.tsx`, `app/_lib/saved-copy.ts`, `app/manifest.ts`, `app/apple-icon.tsx`, `app/pwa-icon/`, `app/_lib/app-icon.tsx`, its Saved copies rules, and `tests/service-worker/`.
- [screens.md](../screens.md): When something goes wrong, No connection.
- [build-plan.md](../build-plan.md): R43, R44; KTD2, KTD19.

## Build

1. **The manifest and icons:** `app/manifest.ts` with "Community Game Library", the short name "Game Library", and kraft and navy as its colors; `pwa-icon/[size]`, `apple-icon.tsx` and the favicon, drawn from the design system's `icon.svg` in recipes' `app-icon.tsx` pattern. Export the file; don't redraw it.
2. **The service worker**, copied from recipes:
   - `rules.ts` with this app's saved pages: `/`, `/my-library`, a game, a copy, `/loans` and a loan, `/nights` and a night, `/friends` and a friend, `/inbox` and `/you`
   - every form, sheet, sign-in and account page, RSC request, server action and API call left to the network
   - `handlers.ts` and `worker.ts`, `scripts/build-service-worker.ts` in the build, with the commit stamped in
   - `SavedCopy` in the `(main)` layout, and signing out deleting the saved pages
   - the proxy letting `/sw.js` through signed out, and `next.config.ts` serving it uncached
   - the `SAVED_COPIES` switch
3. **A6:** on Android, the browser's own install prompt when it offers one (`beforeinstallprompt`); on iPhone, the steps A6 draws.
4. **Link previews:** `opengraph-image.tsx` for the welcome page and the two link pages, drawn as Y2's preview. A preview never names a member or shows a place, an address or a phone (R39, R36).
5. **Offline:** a saved page shows with the no-connection line, and nothing pretends to work.

## Tests

- `rules.ts`: each saved page is answered from its copy, and every other request goes to the network.
- The handlers, against an in-memory cache, as recipes' tests do.
- The layout test still keeps the sign-in kit out of the shared layouts.
- The manifest's fields.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] The batch's preview installs to a phone's home screen, opens full screen with the icon and name Y2 draws, and a page read once opens from its saved copy (the phone check after a day away is H9's, in U25)
- [ ] A link to the welcome page shows Y2's preview in a chat app
- [ ] Committed as `feat(community-game-library): U23 the home screen, saved copies and link previews`
- [ ] Batch 6 is pushed and its PR opened
