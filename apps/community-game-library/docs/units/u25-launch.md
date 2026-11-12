# U25. Production and the first friends

| | |
|---|---|
| Batch | 7, Launch (`feat/community-game-library-b7-launch`) |
| Model | Standard: a checklist, with Hector's steps in it |
| After | U24. Needs H2, H4 and H9 |
| Serves | R39, R44, the Success criteria; KTD1, KTD2, KTD3, KTD22 |

Production is checked end to end, the cold open is measured, the browser flows pass, and Hector invites the circle.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- [build-plan.md](../build-plan.md): Success criteria; Needs from Hector; KTD1, KTD2, KTD3, KTD22.
- `docs/fast-first-open.md`, pattern 1, and `docs/solutions/developer-experience/neon-operations-log-is-the-record-of-database-wake-times.md`.
- Neon's Auth production checklist: `neon.com/docs/auth/production-checklist`.
- Recipes' `tests/flows/`, `playwright.config.ts` and `scripts/check-test-database.ts`, for the flows.

## Build

1. **Production's checklist**, each item checked and noted in the task:
   - every migration applied to production
   - H4 done: Neon Auth's own email sender, the application name, the production domain trusted, and localhost access off
   - H2 done: Google signs in on our own OAuth client
   - `ADMIN_USER_ID` set to Hector's production account (Hector sets it)
   - the two buckets made on production, with Hector's OK
   - `CRON_SECRET` set, and the daily run's first morning seen in Vercel's logs
   - communitygamelibrary.com serving the app over HTTPS
2. **The browser flows (KTD22):** `tests/flows/` with Playwright, on the test project only, behind the test-database guard on port 3302: make an account and set up a profile; then borrow a game, pick it up, give it back and confirm it. Run outside Claude Code's sandbox, as recipes' notes say.
3. **The cold open (KTD2):** after a quiet spell, time a cold open on production from Neon's operations log and Vercel's runtime logs, and write the numbers into KTD2.
4. **The success criteria**, walked through on a phone with Hector: joining through a friend link and adding 20 games in under five minutes; borrowing in three taps from a game's page, and accepting in two; setting up a night with its games in under two minutes.
5. **H9:** Hector opens the app from his home screen after a day away and checks the saved copy shows at once. Then he shares his friend link with the circle.

## Done when

- [ ] Every item in step 1 is noted in the task as done
- [ ] Both flows pass on the test project
- [ ] The cold open's numbers are in KTD2, and meet its target
- [ ] The success criteria were walked through, with the results in the task
- [ ] H9 is done, and the first friends have joined
- [ ] Committed as `feat(community-game-library): U25 production and the first friends`, and Batch 7 is pushed and its PR opened
