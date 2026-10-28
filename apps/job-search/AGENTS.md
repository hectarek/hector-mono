# AGENTS.md — job-search

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers app-specific context

## Overview

A private job search workspace. Its owner and Claude both keep it current, and each day it shows what needs a decision and what's due. Claude is to work in it through page tools (WebMCP) from its own browser profile. Clean architecture on recipes' pattern: [../../docs/clean-architecture.md](../../docs/clean-architecture.md), with `apps/hectors-recipes` as the reference.

[docs/build-plan.md](docs/build-plan.md) is the initial spec: requirements, decisions (KTDs) and units. What's done and what's left lives in Hector's private task tracker, one task per unit under the same U number: start from the unit's task, then follow the spec's How to work from this spec. Setting up Claude's browser: [docs/agent-access.md](docs/agent-access.md).

## Privacy (R24)

- The repo is public. Code, tests, fixtures, docs, tool descriptions, screenshots, commit messages and PR text use fictional or generic data. Companies, people, targets, pay and strategy live only in the app's database or Hector's private docs. A task that would put a specific of the search into the repo stops, and that content goes to one of those two places.
- Signed-out pages, the private screen and the metadata carry the generic name "Job search", never a person's name. Every page is `noindex` (the root metadata) and `app/robots.ts` disallows everything.

## Stack

- Next.js 16, React 19, Tailwind CSS, shadcn/ui via `@repo/ui` (default theme, Geist)
- Neon Postgres via `@neondatabase/serverless`, Drizzle ORM, generated migrations in `db/migrations/`
- Auth via `@neondatabase/auth` (Better Auth powered)
- DI via `@evyweb/ioctopus`

## Differences from recipes

The infrastructure is copied from recipes, not shared (docs/build-plan.md KTD1). Four things differ on purpose:
- **No redirects on the tool path (KTD4).** A redirect navigates the page, so a page tool gets nothing back and Claude can't confirm a write. `proxy.ts` lets a request carrying the `Next-Action` header past its signed-out redirect, both with no session cookie and when the session-cache refresh finds the session ended, so the action answers `unauthenticated` itself. Recipes' proxy redirects them. Actions call `revalidatePath`, never `redirect`, and return an envelope (Backend Rules).
- **Environments (KTD17).** The local `.env` and preview deploys use the Neon test project only. Production values live only in Vercel's Production environment, as sensitive variables, and never pass through a Claude session. Recipes uses its production database locally; this app doesn't, because `.worktreeinclude` copies `apps/*/.env` into every worktree.
- **Logging (KTD20).** Logs carry error classes, codes and record ids, never field values. Recipes logs `err.message`, and a failed query's message carries its parameters (names, notes, pay). Here the transaction manager, `BaseRepository.handleError`, `toActionError` and the auth route log only what `loggable(err)` (`src/entities/errors/loggable.ts`) gives: the error's class and the first code down its cause chain, such as Postgres's SQLSTATE. The auth route logs Neon's failed answers by status and path, never the body.
- **A session that can't be read (U2).** `NeonAuthService` throws when Neon answers `getSession` with an error; recipes' copy returns null, as if signed out. The auth route lets signed-out requests through to Neon (to sign in), so a failure must never read as signed out.

## Architecture

```
app/
  (api)/api/auth/[...path]/  # Neon Auth's endpoints, limited for any session but Hector's (Auth Rules)
  (auth)/                    # Outside the shell: welcome/ (the name and Sign in), auth/[path]/ (Neon's forms)
                             # and private/ (any account but the app's two)
  (main)/                    # Signed in, in the app shell: This week at /, jobs/ (views, [id], [id]/edit, new),
                             # companies/ (list, [id], [id]/edit, new), people/ (list, [id], [id]/edit,
                             # new), practice/ (list, [id], new), settings/, Claude's page at /agent
  _components/               # app-shell.tsx (sidebar on desktop, off-canvas sheet on phones, KTD19),
                             # session-chrome.tsx (Claude's banner and page tools), agent-tools.tsx (the
                             # page tools' registrar), record-history.tsx (a record's history); lists
                             # (company-list, job-list, person-list, contact-list, practice-list), forms
                             # (form-field, conflict-notice, company-form, job-form, person-form,
                             # settings-form, add-source-form, practice-form, practice-fields), quick-log
                             # (the outreach sheet), practice-review (the review sheet), job-status-form,
                             # proposal-review, job-notes, delete-button, remove-contact-button, only-hector
  _lib/                      # auth client, auth paths, current actor (page and action helpers), safe redirect,
                             # page-tools.ts (the WebMCP adapter), agent-tools/registry.ts, call-action.ts,
                             # field-labels.ts, job-labels.ts, format-day.ts, form-changes.ts and
                             # use-record-form.ts (KTD15), load-company.ts, load-job.ts, load-person.ts,
                             # load-practice-session.ts, list-companies.ts (every company, for a picker)
  _providers/                # @repo/ui ThemeProvider around AuthProvider
  actions/                   # shared.ts: the envelope and its helpers (not "use server"); session.ts,
                             # activity.ts, companies.ts, sources.ts, settings.ts, jobs.ts, notes.ts,
                             # people.ts, interactions.ts, practice.ts
  error.tsx, not-found.tsx, robots.ts

src/
  entities/                  # errors (common.ts, loggable.ts), models (actor, activity, agent-session, company,
                             # lead-source, settings, job, job-status-change, note, person, interaction,
                             # practice-entry, input, user, session, transaction, logger), job-lifecycle.ts,
                             # practice-ladder.ts, posting-link.ts, code-point-order.ts, week.ts
  application/repositories/  # interfaces: activity, companies, lead-sources, settings, jobs, notes, people,
                             # interactions, practice
  application/services/      # interfaces: authentication, logger, transaction-manager
  application/use-cases/     # access/ (resolve-actor, require-human), activity/ (record-change, list-activity),
                             # session/ (whoami, start-session), companies/ (find, get, save, delete),
                             # sources/ (add, list, source-named), settings/ (get, update), jobs/ (create,
                             # find, get, update, move, review-proposal, delete, job-checks), notes/ (add,
                             # edit, delete), people/ (find, get, add, update, delete, remove-contact,
                             # person-dates), interactions/ (log, delete), practice/ (list, get, log,
                             # delete, scheduled)
  interface-adapters/        # controllers, one per entry: activity/, session/, companies/, sources/, settings/,
                             # jobs/, notes/, people/, interactions/, practice/
  infrastructure/repositories/  # base, activity, companies, lead-sources, settings, jobs, notes, people,
                             # interactions, practice (each + mock)
  infrastructure/services/   # neon-auth, console-logger, transaction-manager (+ mocks)

di/                          # container.ts, types.ts, modules: logger, authentication, access, transaction,
                             # activity, session, companies, sources, settings, jobs, notes, people,
                             # interactions, practice
db/                          # schema.ts, index.ts, migrations/ (drizzle-kit generated)
lib/                         # auth/server.ts, logger.ts
tests/                       # bun:test, mirroring the source tree; flows/ (Playwright)
playwright.config.ts, proxy.ts
```

## Cache Components

Recipes' rules carry over ([its AGENTS.md](../hectors-recipes/AGENTS.md#cache-components)):
- `export const dynamic`, `revalidate` and `dynamicParams` fail the build. A page that reads the session, its address or the database in its body gets a `loading.tsx` in its own folder.
- Read the session first, then the clock: This week does (`todayIn` runs at request time).
- A page without a `loading.tsx` puts what it reads at request time inside `<Suspense>`: the welcome screen's Sign in, the auth pages' form and the private screen's account. So does the `(main)` layout's `SessionChrome`.
- `experimental.hideLogsAfterAbort` keeps Neon Auth's own `catch` from logging the end of a prerender as a cookie validation error during `next build`.
- `next build` needs `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` set (`lib/auth/server.ts` throws at import without them), but nothing at build time reaches Neon or the database, so placeholder values build.

## Auth Rules

- Two accounts use the app (KTD2): Hector's is the `owner` and Claude's the `agent`, and both act on Hector's rows. Who's acting comes from `app/_lib/current-actor.ts`, as `{ actor, ownerId }`: `getPageActor()` in pages and the session chrome, `getActionActor()` in server actions. Both go through `IResolveActor` (`src/application/use-cases/access/resolve-actor.ts`).
- Identity goes by user id, never email: `OWNER_USER_ID` and `AGENT_USER_ID`, read by `di/modules/access.module.ts` (tests pin `MockAuthService`'s `TEST_ACCOUNTS`). A missing or malformed id refuses every session, and the first refusal logs it.
- Any other signed-in account is refused before anything is read. `getPageActor` redirects it to `/private`, which shows its email and Sign out and nothing else; with no session it throws into `app/error.tsx` (the proxy has already sent signed-out visitors to the welcome screen). `getActionActor` never redirects (KTD4): it throws `NotAllowedError`, which the action answers as `not-allowed`, or `UnauthenticatedError` when no one is signed in.
- A layout doesn't stop its pages from rendering, so every page calls `getPageActor` itself. The `(main)` layout's `SessionChrome` only decorates: Claude's banner and the page tools' registrar, streamed inside `<Suspense>`.
- The auth route passes `GET get-session` and `POST sign-out` from any session (R21: Claude's session can only read itself and sign out). Every other endpoint (update-user, change-email and the rest) reaches Neon only from Hector's session or from no session (signing in). Claude's session gets 403 `human-only`, any other account 403 `not-allowed`, and a session that can't be read gets a 500.
- `IAuthenticationService.getSession()` is null only when no one is signed in, and throws when the session can't be read (Differences from recipes). The private screen reads the email through it. `lib/auth/server.ts` is only for the auth route, the auth page and `NeonAuthService`.
- `proxy.ts` is recipes' cookie check and session-cache refresh ([../../docs/proxy-auth-research.md](../../docs/proxy-auth-research.md), 2026-09 addendum), plus the `Next-Action` pass-through above. Signed-out pages go to `/welcome?redirectTo=<path>`; the welcome and auth pages honor only same-app paths (`app/_lib/safe-redirect.ts`).
- Sign-up is off in the UI: `AuthProvider` sets `signUp={false}`, so the sign-in form has no link to it and its view sends visitors to sign in, and the welcome screen offers only Sign in. Both accounts are created before first use, and Neon's own setting closes sign-up once they exist (the plan's H2).
- Safari can't sign in on `http://localhost` (Neon Auth's cookies are always `Secure`), as in recipes.

## Backend Rules

- **Actions answer an envelope (KTD4).** Each action in `app/actions/<domain>.ts` returns `ActionResult<T>` (`app/actions/shared.ts`) through `answer(op, fallback, run, pages?)`. It runs the action's work and answers `succeeded(data)`, which is `{ ok: true, data, asOf }`, or `toActionError(err, actionLogger(op), fallback)`, `{ ok: false, code, message, fields?, current? }`. On success it revalidates the paths `pages(data)` lists, none for a read, so an action never calls `revalidatePath` itself, and never `redirect`. The mapping: `InputParseError` → `validation` (with `fields`), `UnauthenticatedError` → `unauthenticated`, `NotAllowedError` → `not-allowed`, `HumanOnlyError` → `human-only`, `NotFoundError` → `not-found`, `ConflictError` → `conflict` (with `current`, the record as it is now), `DuplicateError` → `duplicate` (with `current`, the job that holds the posting), `QueueFullError` → `queue-full`, anything else → `unexpected` with the action's own message. A page tool's call can also get `reload-needed` or `unexpected` from its wrapper (Page Tools). `calendar-disconnected` arrives with the calendar (U13).
- **Every write records its change (R19, KTD7).** A write action takes the page tool's name as its last argument, `(input, tool?)`, and builds its `ChangeContext` (`{ actor, ownerId, tool? }`, `src/entities/models/activity.model.ts`) with `changeContext(tool)` (`app/actions/shared.ts`): the session's actor, and the name, checked as input (`toolNameSchema`: snake_case, at most 30 characters), so a bad one is `validation` before anything is written. Inside the write's own transaction, the use case calls `recordChange` (`src/application/use-cases/activity/record-change.ts`) with it. Give `before` and `after` the fields the change touched; it keeps only those whose values differ. The `activity` table is append-only: never update or delete a row.
- Claude's working sessions are in the log too, with no table of their own: `start_session` writes one `created` row per start, record kind `agent-session` and a fresh id, and answers with the changes from the actor's previous start (inclusive) to this one, newest first (`start-session.use-case.ts`). `list_activity`'s `record` filter without an `id` lists every record of a kind.
- A read that has to see the write's own rows runs inside its transaction: pass it the `tx`, as `start-session.use-case.ts` does with `activityRepository.list(ownerId, filter, tx)`. Outside it, Postgres doesn't see the uncommitted rows, and PGlite waits on its one connection.
- **Human-only operations check first (R21, KTD3).** Accepting, dismissing or reopening a proposal, deleting anything, editing a note (Claude's notes only append), connecting or disconnecting the calendar and changing settings: the use case calls `requireHuman` (`src/application/use-cases/access/require-human.ts`) before its own transaction opens. Anyone but Hector gets a `refused` row, written in a transaction of its own so it stays, and `HumanOnlyError`.
- A record that keeps a history adds its kind to `recordKindSchema` (`activity.model.ts`), and its page mounts `<RecordHistory record={{ kind, id }} />`, which shows the latest 50 changes (Hector kept the cap, 2026-10-26). The owner's settings are one record, kind `settings`, whose id is the owner's.
- A screen or tool input gets a label in `FIELD_LABELS` (`app/_lib/field-labels.ts`, which the forms import too): a validation message names only listed fields. A record's history names every field, in words when it has no label (`nextStep` is "Next step").
- **A change is made against what was read (R22, KTD15).** It sends the `updatedAt` read with the record (an ISO time, `timeSchema` in `input.model.ts`, beside the shared date, text and link schemas), and the use case reads the record with `getForUpdate` (`select … for update`, so it stays locked to the write), compares the two in JS and throws `ConflictError(current)` on a mismatch, as `save-company.use-case.ts`, `update-settings.use-case.ts`, `update-job.use-case.ts` and `edit-note.use-case.ts` do. A change that sets what's already there writes and logs nothing. `updated_at` columns keep milliseconds (default `date_trunc('milliseconds', now())`, a JS Date's precision), and each update moves the value on at least a millisecond (`greatest(…, updated_at + interval '1 millisecond')`, the mocks the same), so two changes in one millisecond still conflict.
- A form keeps the record it opened on and sends only the fields typed since, so a field someone else changed meanwhile keeps their value. On `conflict` it stays open on `current` with what was typed kept and lists what changed (`editedFields` and `rebased`, `app/_lib/form-changes.ts`), and the next save goes against `current`'s `updatedAt`. A record's form gets all of this from `useRecordForm(record, fieldsOf, isRecord)` (`app/_lib/use-record-form.ts`): the record it opened on, the fields as typed, `edited`, `save(run, onSaved)` with the rebase on a conflict, `reopen` for a form that stays on its page (settings), and the `changes` its `ConflictNotice` lists.
- Names that compare loosely keep a key column the entity computes: `companyNameKey` (case and punctuation ignored) for the soft duplicate warning and `find_companies`, `sourceNameKey` (case and runs of spaces) under `lead_sources`' unique index, so `add_source` answers with the source already listed. Keys and names sort with `collate "C"`, by code point as the mocks sort, so the two backends agree.
- **Jobs and the review queue (R20, KTD8)** are one table, told apart by `review_state`. Who is acting decides a new job's review, whatever the entry point (KTD3): Claude's is a pending proposal, which needs its posting's link and Claude's reason, Hector's is accepted at once, and both start in verify (`create-job.use-case.ts`). Claude leaves a dismissed proposal as Hector left it, so its posting stays refused: `update_job` refuses it from Claude with `validation`, and only Hector's reopen brings it back. `find_jobs` reads accepted jobs unless asked for another review state. A new job, or a new posting link, takes the owner's queue lock (`lockQueue`, a `pg_advisory_xact_lock`) before it checks for a duplicate posting (`posting-link.ts`'s key, under a partial unique index) and Claude's pending cap (settings), so two writes at once settle one at a time. `DuplicateError` answers `duplicate`, its `current` the job that holds the posting (`job-checks.ts`); `QueueFullError` answers `queue-full`. A job's write reads its company locked (`requireCompany`), so a company's delete and a write that names it settle one at a time.
- **A status move is a pure rule and two rows (R2, R3, KTD7).** `job-lifecycle.ts` says what a move sets (applied-on, the follow-up, a closing's cleared next step); `move-job.use-case.ts` writes the job, its dated `job_status_changes` row and its history in one transaction. Only an accepted job moves, and a move to the status it holds writes and logs nothing, so a retried move never counts twice. `set_job_status` takes open statuses and `close_job` closed ones with a reason. Claude sets applied-on only with a move: `update_job` refuses it from Claude with `validation`.
- A job names its lead source by name, found ignoring case or added and logged (`sources/source-named.ts`, which `add_source` shares). Notes are records of their own in the log (kind `note`), pointing at their job by kind and id; a job's delete takes its notes and status moves with it, and `add_note` reads the job locked, so a note added meanwhile can't outlive it. A company with jobs refuses its delete, proposals included, dismissed ones too (each keeps its posting from coming back), and names them; its page lists its proposals and dismissed ones under their own headings.
- **People and the outreach log (R7, R8, KTD9).** A person's messaged, replied and met dates are their latest sent message, reply and held conversation in `interactions`, read each time and never stored: the people repository returns a `PersonRecord`, and the use cases add the dates with `withDates` (`people/person-dates.ts`), one query for a page. `log_interaction` logs one interaction per person named, several only for sent messages (at most 20), today by default and never after it, a scheduled conversation on its start's day; or it records how a scheduled conversation ended, where the same outcome again changes nothing and another is refused. It can set the people's next step and date as it goes. A job named links each person as its contact (`job_people`, also linked by `add_person`'s `jobId`), and a sent message linked to an applied job moves the job's next date to applied-on + 14 (`afterFollowUp`), logged on the job. The stale rule reads the job's latest linked reply (`isStaleCandidate`, `JobDetail.repliedOn`). Deleting a person takes their interactions and links with them; deleting a job drops its contact links and unlinks its interactions, which stay on their people; a company with people refuses its delete. Taking a contact off a job is human-only (`remove-contact`), as deleting is.
- **The practice log (R11, U8)** is one table, `practice_entries`: sessions and their reviews, a review pointing at its session and going with it (record kind `practice-entry`). When the next review is due is worked out each time by `practice-ladder.ts`'s `nextReview`, never stored: a pure replay of the session and its reviews in the order they happened, so a deleted review takes its step with it. The first review comes 2 days after the session whatever its result (as the sheet's formula did), a solved review moves to the next step 7 and then 21 days later, none follows the third, and a failed or partial one is retried 2 days later on the same step. The use cases add it with `scheduled` (`practice/scheduled.ts`). `log_practice` logs a session, or with a `sessionId` that session's next review: today by default and never after it, never before the try it follows, and refused once the third review is solved. A review reads its session locked, so two at once settle one at a time. `listOpen` leaves out sessions with `LADDER_STEPS` solved reviews in SQL, and `list_practice` keeps those due by today in Eastern time, the earliest first.
- An error class thrown inside a transaction goes in the transaction manager's `DOMAIN_ERRORS`, or the action sees "Transaction failed" instead. Recipes' `UnauthorizedError` isn't here: nothing threw it, and `NotAllowedError` and `HumanOnlyError` are the refusals.
- Every repository query takes the owner id (KTD2), with a PGlite test that another owner's rows stay out. A repository passes `handleError` record ids only.

## Page Tools

Claude works in the app only through page tools (WebMCP, KTD5). Setting up its browser and permissions: [docs/agent-access.md](docs/agent-access.md).
- `app/_lib/page-tools.ts` is the only module that touches `document.modelContext`, typed by hand from the W3C draft of 20 October 2026 as an optional property of `Document`. `registerPageTools(tools, signal)` registers each tool until the signal aborts (there's no `unregisterTool`), does nothing without the API, and drops the browser's expected refusals (`AbortError`, `InvalidStateError`), so none surfaces as an unhandled rejection. Any other refusal stays one, in the browser's console, rather than a tool that's quietly missing.
- A tool is one entry in `app/_lib/agent-tools/registry.ts`: a snake_case name of at most 30 characters, a generic description under 500 characters (R24), the JSON Schema (`z.toJSONSchema`, `io: "input"`) of the entity schema its controller parses with, its annotations (`readOnlyHint` on reads, `consequentialHint` on steps Claude Code asks about first, `untrustedContentHint` on results that can carry outside text) and its action. Adding, removing or changing a tool bumps `TOOL_SET_VERSION` (`src/entities/models/agent-session.model.ts`), which `whoami` reports, and lists the tool's schema in `tests/app/_lib/agent-tools/registry.test.ts`.
- `app/_components/agent-tools.tsx` registers every tool on mount and aborts on unmount, so the list is the same on every page. `ActorChrome` (`session-chrome.tsx`) renders it for Claude's session only. A call runs its action through `callAction` (`app/_lib/call-action.ts`) inside a transition, which answers with the action's envelope unchanged, `reload-needed` when the server no longer knows the action (a deploy since the page loaded, so nothing ran), or `unexpected` with "Couldn't reach the server" for any other throw: a tool that throws reaches Claude only as "invocation failed".
- The browser checks nothing against a tool's input schema: the controller's parse is the only check.
- Claude's page, `/agent`, lists the tools and Claude's latest changes, with no calendar and no auto refresh (KTD6). A write that changes what it shows revalidates it, as `start_session` does.
- U5's, U6's, U7's and U8's tools wait for U4's gate (its execution note). Their actions already take `(input, tool?)`, or `(input)` for a read, and parse with an entity schema, so each needs only its registry entry: `findCompanies`, `getCompany`, `saveCompany`, `addSource`, `listActivity`, `findJobs`, `getJob`, `proposeJob`, `updateJob`, `setJobStatus`, `closeJob`, `addNote`, `findPeople`, `getPerson`, `addPerson`, `updatePerson`, `logInteraction`, `listPractice` and `logPractice`. Human-only, with no tool: `deleteCompany`, `updateSettings`, `acceptProposal`, `dismissProposal`, `reopenProposal`, `deleteJob`, `editNote`, `deleteNote`, `deletePerson`, `deleteInteraction`, `removeContact` and `deletePracticeEntry`. Hector's form adds jobs through `addJob`, which refuses Claude's session: a proposal needs its posting's link and a reason, which only `proposeJob` takes.

## Logging Rules

- Never call `console.*` directly.
- Use `ILoggerService` in server-side app code and the layers; `lib/logger.ts` in root files that wrap `lib/auth/server.ts` (the auth route).
- Log error classes, codes and record ids, never a field value, an error's message, a response body or a token (KTD20): pass an error through `loggable(err)`.
- A new error class sets `override name = "<ClassName>"`, as those in `src/entities/errors/common.ts` do: the production build renames classes (`class D extends Error`, checked in `.next/server` on 2026-10-23), and `loggable` names an error by its `name`.

## Environments

- Env names, in `.env.example` and `turbo.json`: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `OWNER_USER_ID`, `AGENT_USER_ID`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_CALENDAR_ACCOUNT_EMAIL`, `CALENDAR_TOKEN_KEY`, `LOG_LEVEL`. Turborepo withholds any variable `turbo.json` doesn't list from `next build`. The browser flows' `FLOW_AGENT_EMAIL` and `FLOW_AGENT_PASSWORD` are in `.env.example` only: the build never reads them.
- The local `.env` holds test-project values only: the Neon project `job-search-test`, whose database carries that name as its comment. `tests/_support/preload.ts` deletes every one of the build's variables but `LOG_LEVEL` before the tests run. The repo's settings deny reading `.env` files, so a command that needs them (the flows, `db:migrate`) runs outside Claude Code's sandbox, and nothing prints their values.
- Ports: `next dev` on 3101 (`.claude/launch.json`); the browser flows' own server on 3301 (`playwright.config.ts`).
- Deploying: a Vercel project rooted at `apps/job-search`, on the default `vercel.app` domain, built only when the app changed (`vercel.json`'s `ignoreCommand`). Production's addresses stay out of the repo, so they can't be found from it.
- Production deploys `main`, with production's variables. Previews use the test project's variables and sit behind Vercel Authentication. A preview signs in only at its branch alias, `<project>-git-<branch>-<team>.vercel.app`, and only once the test project's Neon Auth trusts that alias, so add each new branch's alias when it first deploys. Neon takes a wildcard only as the leftmost whole label, which a Vercel address doesn't have.
- Production gets its migrations only from Hector's terminal (KTD17): `bun run db:migrate:production` (`scripts/migrate-production.ts`) reads the URL from a prompt that shows nothing, refuses `.env`'s URL and the test database, lists what drizzle will apply and applies it only when he types `migrate`. It also refuses a target that records migrations the journal doesn't have, or a migration drizzle would skip (one older than the newest the target records), and fails if any is still unapplied afterwards. It won't run without a terminal, but that isn't the boundary (the desktop app's terminal tool has one): the production URL never reaches a Claude session, and only Hector types `migrate`.
  - When Hector asks Claude to migrate production instead (`0000_activity` on 2026-10-25, `0001` and `0002` on 2026-10-27), Claude uses the Neon MCP, which never shows the URL: `prepare_database_migration` on a temporary branch, a check there, then `complete_database_migration`. The SQL is the pending migrations as drizzle's `readMigrationFiles` reads them, plus an `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)` for each, with that reader's hash and the journal's `when`, so the wrapper finds nothing left to apply.
- The `ignoreCommand` compares a push with the branch's last successful deploy, or with the commit before it on the branch's first deploy, so a branch's first push builds no preview when its last commit changes nothing in the app (a merge from `main`, say). A redeploy of the last successful deploy is skipped the same way (Vercel shows it Canceled), so a changed variable reaches production only with the next commit that builds the app. See the [monorepo guide](../../docs/monorepo-guide.md#building-only-the-apps-that-changed).
- Run the Vercel CLI inside Claude Code's sandbox (`allowed_domains` api.vercel.com). Outside it, CLI 60 found no sign-in and logged out (2026-10-24).

## UI Rules

- The shell is `app/_components/app-shell.tsx`. A unit that adds a section adds its item to the sidebar menu.
- The plan's UI definition of done asks for 44 × 44 px touch targets. `SidebarMenuButton` at `lg` is 48 px, but in the default theme `Button` at `lg` is 36 px: recipes reaches 45 px only through its theme's spacing. A `Button` that's a touch target adds `min-h-11` (44 px; the design lint counts height as layout), as the private screen's Sign out does, and so does an `Input`. `NativeSelect` puts its class on a wrapper, so its select can't reach 44 px: the company form's tier is a `ToggleGroup` of `min-h-11 min-w-11` items instead.
- A form is a page in the shell (`/companies/new`, `/companies/[id]/edit`, `/jobs/new`, `/jobs/[id]/edit`), as recipes' forms are, not a dialog: a phone can't fit a record's fields in one. It saves through `useRecordForm`'s `save`, which calls its action through `callAction` in a transition, and goes on with `router.push` after success (KTD4). A record's form lays out each field with `FormField` (text, a link, a number, a date, long text, or a few choices as toggles) and shows a conflict with `ConflictNotice`; deleting anything asks first through `DeleteButton`, given a bound action (`deleteJob.bind(null, { id })`).
- The quick log (`quick-log.tsx`, R8) is a bottom sheet behind a "Log" button: a sent message, a reply or a held conversation, today by default, saved with one tap. It opens on a person from their page, with their jobs to link to; from a job's page with the job; and from People with a search, where a sent message can go to several people and a search with no match offers to add the person by name and company. A form that picks a company (the person form, the sheet's add) takes its name from a datalist of `listCompanies` and resolves it to an id on the client, refusing a name that isn't listed.
- Practice (R11): the practice page lists the reviews due, each logged from `PracticeReview`, a bottom sheet behind "Log review", once its result is picked, and the latest sessions. A session is logged on its own page (`/practice/new`, `PracticeForm`), and its page (`/practice/[id]`) holds its reviews, the review sheet and Hector's deletes. The form and the sheet share a try's fields through `TryFields` (`practice-fields.tsx`).
- Values show by their labels in `app/_lib/job-labels.ts` and dates through `formatDay`, never raw (`offer-declined` is "Offer declined").
- In Claude's session a human-only control shows, off, with "Only Hector" beside it (KTD3): `OnlyHector` (`app/_components/only-hector.tsx`) draws Delete on a company's or a job's page, Edit on a dismissed proposal, a note's Edit and Delete, and the review's buttons; the settings form turns its own inputs off. Disable each input, not a `fieldset`: happy-dom doesn't pass a fieldset's disabled state to its inputs.
- Lists are a table from `md` up and cards (`Item` rendered as a `Link`) below (KTD19), as `company-list.tsx` is.

## Testing

- `tests/` mirrors the source tree (`proxy.ts` → `tests/proxy.test.ts`); run tests from this folder so `bunfig.toml`'s preload applies.
- The preload points `@/db` at PGlite, swaps `@/lib/auth/server` for a stand-in whose route handler records what reached Neon and whose `getSession` tells the auth page who's signed in (`tests/_support/neon-auth.ts`; set `neonAuth.answer` to make Neon fail or `neonAuth.session` to sign someone in, and `neonAuth.reset()` after), makes `redirect()` throw `Redirected` and `notFound()` throw `NotFoundPage` (`tests/_support/next.ts`), and stubs `next/font/google` for the root layout.
- Database: PGlite, an in-memory Postgres (`tests/_support/database.ts`), with the real migrations applied, so nothing in tests reaches Neon. Use-case and repository tests use `describeEachBackend` and `makeApp()` (`tests/_support/app.ts`, recipes' harness): each test runs on the mock repositories and on the real ones over PGlite, and one that fails only on `[postgres]` means a mock has drifted from the SQL. What only a database shows, such as a rollback, is tested on PGlite alone, with `resetDatabase()` in `beforeEach` and `sql()` for checks, never inside an open transaction (PGlite has one connection).
- `RecordingLogger` (`tests/_support/logger.ts`) keeps every line logged at every level, so a test can show a value never reached the logs (KTD20).
- Who's signed in: `signInAs("owner" | "agent" | "stranger" | "signed-out")` (`tests/_support/session.ts`) sets the test container's `MockAuthService`. The container lives for the whole run, so every test that depends on the session calls it. Its mock repositories keep their rows for the whole run too, and the owner never changes, so a test that goes through the container works on records of its own (a fresh `crypto.randomUUID()`).
- Screen tests are `*.test.tsx`, as in recipes: `bunfig.toml` leaves them out of a plain `bun test`, `bun run test:screens` runs them with happy-dom (`tests/_support/dom.ts`), each file isolated, and `bun run test` runs both. Server components render with `renderOnServer` (`tests/_support/server-render.ts`): the tree streams as the server would send it, async components and `<Suspense>` included, into the page, and Testing Library's `within` finds things in it. What a component throws inside `<Suspense>`, such as a `redirect()`, goes to the `onError` a test passes it. Client components render with Testing Library's `render`, which runs their effects; `dom.ts` loads it once the document is in place and unmounts what it rendered after each test. `dom.ts` also gives Testing Library's waits (`findBy…`, `waitFor`) 3 seconds rather than 1, because CI's runners stall for about a second now and then. Fallow (3.36) follows that preload, so `dom.ts` needs no entry in `.fallowrc.json`.
- The preload stubs `next/cache` (`nextState.revalidated` in `tests/_support/next.ts` keeps the paths an action revalidated) and keeps Next's real `unstable_isUnrecognizedActionError` in its `next/navigation` stand-in, whose `useRouter` keeps where a screen went in `nextState.pushed`.
- In screen tests, a `Button` rendered as a `Link` (`nativeButton={false}`) has the role `button`, not `link`, and a card `Item` that's a link is named by all its text. Testing Library's bound queries (`render(…).getByLabelText`) take no type argument: assert with `toHaveProperty("value", …)`. Fire `submit` at the form, never a button: React builds the form's data from the event's target, which happy-dom can't do for a button.
- `MockTransactionManagerService` runs one transaction at a time, as PGlite's one connection does, so two writes started together settle on the mocks as the database's locks settle them. Don't start a transaction inside another: on either backend it waits forever.
- Fixtures: `tests/_support/jobs.ts` makes companies and jobs through the use cases (both backends), and `tests/_support/screens.ts` through the actions, for screens. The test container keeps every record for the whole run, so a test names its own (a random suffix) and resets `nextState` after its setup.
- Page tools: `tests/_support/model-context.ts` is a fake `document.modelContext` that behaves as flag-enabled Chromium 156 did when measured (rejections, abort unregistering, results as JSON text). `setModelContext` gives the page one, or none, with a stand-in document in a plain test.
- Browser flows are `tests/flows/*.flow.ts`: Playwright's Chromium with `--enable-features=WebMCP`, run with `bun run test:flows`, locally only (not in `bun run test` or CI). `playwright.config.ts` starts its own `next dev` on 3301, never reused, which reads `.env`; the flows sign in as Claude's test-project account from `.env`'s `FLOW_AGENT_EMAIL` and `FLOW_AGENT_PASSWORD`. Before the server starts, `scripts/check-test-database.ts` stops the run unless `.env`'s database carries the test project's comment (`COMMENT ON DATABASE neondb IS 'job-search-test'`) and its auth is on the same Neon endpoint, as recipes' check does (KTD17). Next allows one `next dev` per folder, so stop a 3101 preview in the same checkout first. Chromium (`bunx playwright install chromium`) won't start inside Claude Code's sandbox (a ProcessSingleton error), so run the flows outside it.

## Commands

```bash
bun run dev --filter=job-search
bun run build --filter=job-search
bun run --filter=job-search db:generate --name=<what>   # after editing db/schema.ts; review the SQL
bun run --filter=job-search db:migrate    # the test project (.env); production migrates from Hector's terminal (KTD17)
cd apps/job-search && bun run db:migrate:production   # production only, from Hector's own terminal, never Claude
bun run test --filter=job-search          # both passes; or from apps/job-search: bun test tests/proxy.test.ts
bun run --filter=job-search test:screens  # the screen tests (*.test.tsx) alone
cd apps/job-search && bun run test:screens ./tests/app/_components/quick-log.test.tsx   # one screen file: a plain bun test skips *.test.tsx, and the path needs ./
bun run --filter=job-search test:flows    # the browser flows, on the test project (needs Claude's account in .env)
```

## Before Finishing Any Change

```bash
bun check --filter=job-search && bun ts --filter=job-search
bun run test --filter=job-search
bun run dead-code
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
