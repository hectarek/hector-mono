# U17. The daily run

| | |
|---|---|
| Batch | 4, Loans (`feat/community-game-library-b4-loans`) |
| Model | Strong: a scheduled job that must never write twice |
| After | U14 and U15. Needs H7's `CRON_SECRET` before the batch merges |
| Serves | R25, R26 (the morning of a night), D15, AE3; KTD8 |

Every morning the app writes the day's reminders, and closes the returns their owners left for a week.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Job-search's daily run, as the pattern: its KTD24 in `apps/job-search/docs/build-plan.md`, `apps/job-search/app/(api)/api/cron/archive-expired/route.ts`, its test in `apps/job-search/tests/app/(api)/api/cron/archive-expired/route.test.ts`, and the `schedules` entry in `apps/job-search/vercel.json`.
- Vercel's Schedules docs: `vercel.com/docs/schedules` and `vercel.com/docs/schedules/limits`.
- [data-model.md](../data-model.md): notices' `reminded_on` index, the reminder types, and D15's week.
- [build-plan.md](../build-plan.md): R25, D15, AE3; KTD8, KTD9.

## Build

1. **`src/entities/reminders.ts`**, pure, for a list of loans and nights and today in Eastern time:
   - for each loan that's `'out'`: `due-soon` when it's due in two days, `due-today` when it's due today, `due-back-today` (to the owner) when it's due today, and `overdue` (to both) one day after it's due and every three days after
   - `night-today` for everyone going to a night that starts today and isn't cancelled
   - which `'returning'` loans are 7 or more days past `returned_on`
2. **`run-daily`**: writes each reminder with `reminded_on` set to today, so the unique index lets nothing in twice (insert, and do nothing on a conflict). It closes each return left a week, as `'returned'` on the borrower's day, with `return-closed` to the owner. Each loan's and night's writes are a transaction of their own.
3. **The route** `app/(api)/api/cron/daily/route.ts`: POST only, `Authorization: Bearer <CRON_SECRET>`, and 401 for anything else. It logs only counts. Add its proxy exception.
4. **`vercel.json`**: a `schedules` entry named `daily`, with `"schedule": "0 7 * * *"`, `"timezone": "America/New_York"`, `"path": "/api/cron/daily"` and `"requestMethod": "POST"`. `CRON_SECRET` goes in `turbo.json`'s list and `.env.example`.

## Tests

- AE3: for a loan due on a Friday, the borrower gets `due-soon` on Wednesday and `due-today` on Friday, the owner `due-back-today` on Friday, and both `overdue` from Saturday and every three days after, until the borrower gives it back.
- A return left 7 days closes on the borrower's day, with `return-closed`.
- A second run the same day writes nothing.
- The route refuses a request without the secret, or with the wrong one.
- `night-today` goes only to people going, and not for a cancelled night.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] The route answers a local POST with the secret and refuses one without it
- [ ] H7's `CRON_SECRET` is set in Vercel's Production environment before the merge, and the task says so
- [ ] Committed as `feat(community-game-library): U17 the daily run`
- [ ] Batch 4 is pushed and its PR opened
