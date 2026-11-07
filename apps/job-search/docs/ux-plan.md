# UX plan

The initial spec for the usability pass after the cutover: what the audit of 2026-11-06 found, and the units that fix it, in order. The build's spec, [build-plan.md](./build-plan.md), still governs behavior through its requirements (R) and decisions (KTD). A unit that changes one says so, and the spec marks it revised, with its date, in the unit's PR.

## Status

In Hector's private task tracker, not here: one task per unit, under the same UX number, and the open questions below, assigned to him. This doc changes only when a decision changes it, marked revised with its date.

## How to work from this plan

1. Find the unit's task in Hector's task tracker. Its criteria say what's left, and its notes what earlier sessions did.
2. Read the root `AGENTS.md`, the app's [AGENTS.md](../AGENTS.md) (UI Rules first) and `packages/ui/AGENTS.md`. Then read the design system's page for each piece the unit names; the design system is linked from the app's UI Rules.
3. Read the unit below, the findings it fixes, and only the requirements it cites. Settle its open questions with Hector before building.
4. Before stopping, record progress in the task. A unit's evidence (what changed, the checks, the PR, screenshots from the test project) goes in its task's notes, never here.

## Unit list

Each unit is one task in Hector's task tracker. Owner C is Claude; C+H is Claude after Hector's OK at that moment.

**Phase 1: Fixes first**
- **UX1** Stop the two ways the daily loop writes wrong data — C
- **UX2** See where you are and what's picked — C · needs Q9

**Phase 2: The daily loop**
- **UX3** Done and push on every due row — C · needs Q2, Q3, Q5
- **UX4** This week you can scan — C · needs Q10 · revises R9
- **UX5** Log outreach from anywhere — C
- **UX6** The outreach backlog, dated — C · needs Q1
- **UX7** One pass over the imported next steps — C+H

**Phase 3: Records**
- **UX8** Record pages that lead with what's next — C · needs Q7
- **UX9** Moving a job, and what comes next — C
- **UX10** Values in words, said one way — C · needs Q6

**Phase 4: Claude's work and decisions**
- **UX11** Proposals decided from the card — C
- **UX12** Claude's changes you can check — C
- **UX13** Stale candidates and debriefs — C · needs Q4

**Phase 5: The Friday review**
- **UX14** A weekly review you can do from the app — C

**Phase 6: Lists and capture**
- **UX15** Lists that show what needs attention — C
- **UX16** Add a job from its link — C

**Phase 7: Practice and accessibility**
- **UX17** Practice that fits the loop — C
- **UX18** What's left for screen readers and keyboards — C

Where the units sit among the build's remaining units (U12 to U17) is open question Q8.

## What Hector comes to the app for

| Job                                                         | How often                 | Where it starts             | Spec   |
| ----------------------------------------------------------- | ------------------------- | --------------------------- | ------ |
| Clear what's due: do the next step, or move it              | Daily                     | This week                   | R3, R9 |
| Log outreach: a message sent, a reply, a conversation       | Daily                     | People, a person, This week | R7, R8 |
| Decide on Claude's proposals                                | Daily when Claude has run | This week                   | R20    |
| Debrief a conversation                                      | After each one            | This week                   | R8     |
| Check what Claude changed                                   | Daily when Claude has run | This week, Claude           | R19    |
| Add a job he found                                          | A few times a week        | Jobs                        | R1     |
| Move a job on: applied, screen, onsite, an offer or a close | A few times a week        | A job                       | R2, R3 |
| Log practice, and its reviews when due                      | A few times a week        | Practice, This week         | R11    |
| The Friday review                                           | Weekly                    | Weekly review               | R10    |

The spec's success criteria set the bar: his part of a daily session in about 10 minutes, and the Friday review in about 15, from the app alone.

## What the audit found

**Verdict.** The app holds the whole search and its rules work, but it fails the success criteria. With the volume of the cutover week, the daily part takes an estimated 15 to 25 minutes, because most tasks can't be finished from where they're shown: a step can't be marked done, a push needs the date picker, a job's follow-up detours through its page, and a logged message leaves its row due. The Friday review can't be done from the app, which shows the week's counts but none of the records behind them. Two bugs can write wrong data. For a screen reader or a keyboard, every page has the same title, a picked choice has no visible state, and focus is lost after most saves. Phases 1 to 3 should bring the daily part to about 10 minutes; Phase 5 makes the Friday review possible.

### How it was done

- **Production, read-only, 2026-11-06,** the day after the cutover, on the real data. Every signed-in screen and sheet was walked at 375 × 812 (dark and light) and 1280 × 800 (dark), with nothing submitted. Measured in the page: what's clickable and what it's called, picked states, table widths, contrast samples, how far down each section sits on a phone, and load timings.
- **Three independent reviews of the code behind each screen,** given the screenshots, the spec and the rules but not the walkthrough's conclusions: the daily workflows, the information architecture and content, and accessibility and phone ergonomics.
- **Each finding kept was checked** against the code or the screen; one found only in the code says "from the code".
- **Not seen live:** the signed-out screens, any success, error or conflict state after a submit, and a pending proposal, a conversation to debrief or a practice review due, since none existed that day.

The data that day shaped several findings: about twenty tasks due on This week, most of them late; about seven in ten people with a next step and no date; and many next steps imported from the sheet as notes rather than actions.

### Findings

Severity: **high** means wrong data, or a daily job blocked or much slower; **medium**, friction or confusion in a regular job; **low**, polish.

| #   | Finding                                                                                                                                                                                                                                                                                              | Severity         | How often                            | Where                            | Unit |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------ | -------------------------------- | ---- |
| 1   | The sheet under the next-up card keeps the record it first opened on. Once the top task changes, its Save and Log sent write to the task that was there before (`due-list.tsx` renders the card's action with no key, and `use-record-form.ts` keeps `opened` from the first render). From the code. | High: wrong data | Daily                                | This week                        | UX1  |
| 2   | Default dates are fixed when a component first renders, so a page left open overnight logs or moves things on yesterday, into last week's counts (`quick-log.tsx`, `job-status-form.tsx`, `practice-fields.tsx`). From the code.                                                                     | High: wrong data | Rare                                 | Quick log, status move, practice | UX1  |
| 3   | A picked choice can't be seen: in dark mode its fill is the sheet's own color, and in light mode it's about 1.15:1 against white (the shared toggle's `aria-pressed:bg-muted`). This holds in every choice group: what happened, status, level, work mode, tier, rank, result.                       | High             | Daily                                | Every choice group               | UX2  |
| 4   | On a phone the menu stays open over the new page after a tap, so changing section takes three taps. The menu has no close button, the top bar scrolls away with the page, and Sign out sits flush under Settings and signs out as its page loads.                                                    | High             | Daily                                | Shell                            | UX2  |
| 5   | Nothing marks where you are: no menu item is current (the menu's active fill would be about 1.1:1 if it were used), the menu isn't a `nav`, and the phone's top bar shows only the menu button.                                                                                                      | Medium           | Daily                                | Shell                            | UX2  |
| 6   | A due row has no "done". Its sheet offers Save, Clear, and for a person Log sent. Log sent records the message but keeps the old step and date, so the row stays late. Clear erases the step and records nothing about what happened.                                                                | High             | Daily                                | This week                        | UX3  |
| 7   | Pushing a step to another day takes about five taps through the native date picker.                                                                                                                                                                                                                  | High             | Daily                                | This week                        | UX3  |
| 8   | A job's follow-up done outside the app can't be recorded from This week. One sent through a portal has no path at all, and R3 dates the next one from applied-on whatever day the follow-up went.                                                                                                    | High             | Daily                                | This week, a job                 | UX3  |
| 9   | Nothing confirms a one-tap action or offers undo. `@repo/ui` ships a toaster the app never mounts.                                                                                                                                                                                                   | Low              | Daily                                | Everywhere                       | UX3  |
| 10  | This week is one flat list: about five phone screens at the volume seen, late and today mixed with no counts, job and person rows the same shape, the record's name in muted text under its step, and every action named "Change".                                                                   | Medium           | Daily                                | This week                        | UX4  |
| 11  | The next-up card holds the oldest task, which with a backlog is the one put off longest.                                                                                                                                                                                                             | Medium           | Daily                                | This week                        | UX4  |
| 12  | Only what's due by today shows. Steps later in the week show nowhere, and the page doesn't say what today is.                                                                                                                                                                                        | Medium           | Daily                                | This week                        | UX4  |
| 13  | Outreach is logged only from People, a person or a job: there's no Log on This week or in the shell. People's log can't link a job, and its search shows names only.                                                                                                                                 | Medium           | Daily                                | Quick log                        | UX5  |
| 14  | A next step with no date never reaches This week, and about seven in ten people had one. A job added with no step drops out of the loop too, and People sorts by name only.                                                                                                                          | High             | Daily                                | This week, People                | UX6  |
| 15  | Many imported next steps hold reasons rather than actions ("wait: …", "none: …"), long and lowercase, and every daily view shows them as tasks.                                                                                                                                                      | Medium           | Daily                                | This week, lists                 | UX7  |
| 16  | A record's page opens on the status picker, which fills a phone's first screen, and lists the next step 12th of 14 facts, about two screens down. Changing the step takes the full edit form.                                                                                                        | High             | Daily                                | A job, a person                  | UX8  |
| 17  | A job's page doesn't show its outreach: messages, replies and conversations linked to it show only on each contact's page. From the code.                                                                                                                                                            | Medium           | Weekly                               | A job                            | UX8  |
| 18  | Back links always go to the section's list, never to where you came from.                                                                                                                                                                                                                            | Medium           | Daily                                | Record pages                     | UX8  |
| 19  | A person's page puts a red Delete beside every interaction and hides each interaction's note. Its notes are one block of text, where a job's are dated entries.                                                                                                                                      | Low              | Weekly                               | A person                         | UX8  |
| 20  | A company's page leads with its facts, empty on most companies, and its jobs table repeats the company's name.                                                                                                                                                                                       | Low              | Weekly                               | A company                        | UX8  |
| 21  | A move to Screen, Onsite or Offer keeps the old step and date, so an old "Follow up" stays due. The picker doesn't mark the current status, and every close needs a typed reason.                                                                                                                    | Medium           | Weekly                               | A job                            | UX9  |
| 22  | History and conflict notices show raw values: ISO dates, status keys, bare numbers.                                                                                                                                                                                                                  | Medium           | Daily                                | Record pages                     | UX10 |
| 23  | One idea gets several names and formats. When a step is due is written four ways, dates always carry the year, a tier is "2" in one place and "Tier 2" in another, "Closed" is both a tab and one closed status, and the timing tower shows only codes.                                              | Low              | Daily                                | Everywhere                       | UX10 |
| 24  | The proposal card shows role, company, location and work mode, but not the level, band, Claude's reason or posting that F2 asks for, so judging one means opening the job. From the code.                                                                                                            | High             | Daily when Claude proposes           | This week                        | UX11 |
| 25  | Claude's changes say "Closed a job as …" or count records by kind, without naming or linking them, and empty sessions still show. Claude's page lists its tools before its activity. The spec relies on this list instead of a confirmation step for Claude's closes.                                | High             | Daily when Claude works              | This week, Claude                | UX12 |
| 26  | A stale candidate closes in one tap with no other choice and no undo. Moving it back to applied flags it again at once (from the code).                                                                                                                                                              | Medium           | Weekly                               | This week                        | UX13 |
| 27  | Hector can't log a conversation ahead of time, so only Claude's reach the debrief list, and the debrief card shows neither the person's step nor the linked job.                                                                                                                                     | Medium           | Weekly                               | Quick log, This week             | UX13 |
| 28  | The weekly review shows the five counts and two fields: nothing behind a count, last week one page away, no pipeline, no closes and their reasons, and not last week's one change.                                                                                                                   | Medium           | Weekly; decides the Friday criterion | Weekly review                    | UX14 |
| 29  | Lists cut off what matters: the jobs table scrolls sideways on a laptop, a phone card's long step hides its due date, the due date has no column of its own, and Closed shows "—" on every row.                                                                                                      | Medium           | Daily                                | Jobs, People, a company          | UX15 |
| 30  | The Jobs list has no stages, counts or search; companies show columns that are empty on every row instead of open jobs and people; People sorts by name.                                                                                                                                             | Medium           | Weekly                               | Lists                            | UX15 |
| 31  | Adding a job starts with the company; a new company takes you out of the flow; then 17 fields in one column. A duplicate posting is found only on save, and a new job can't start at applied or get a next step by default.                                                                          | Medium           | Weekly                               | Add a job                        | UX16 |
| 32  | Practice: type and pattern are free text, a review sheet doesn't show the session's notes, and there's no way to log from This week.                                                                                                                                                                 | Low              | Weekly                               | Practice                         | UX17 |

**Accessibility and the phone.** WCAG 2.2 AA criteria in brackets. Contrast was computed from the theme's tokens; the light-mode figures match the samples measured on production.

| #   | Finding                                                                                                                                                                                                                                  | Severity | How often               | Where             | Unit |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------- | ----------------- | ---- |
| 33  | Every page's title is "Job search" (`app/layout.tsx` sets the only one), so tabs and history can't tell pages apart, and a screen reader hears nothing on navigation: Next's route announcer speaks only when the title changes [2.4.2]. | High     | Daily                   | Every page        | UX2  |
| 34  | The bottom sheets aren't forms: on an iPhone the keyboard's Go doesn't save, Enter doesn't on a laptop, the keyboard can cover Save, and a long title runs under the close button. From the code.                                        | Medium   | Daily                   | Every sheet       | UX3  |
| 35  | On a phone the quick log puts Save below every optional field, and a long job choice can push the sheet sideways, since choices don't wrap [1.4.10]. From the code.                                                                      | Medium   | Daily                   | Quick log         | UX5  |
| 36  | The once-a-minute refresh can close an open sheet, losing what was typed, or move rows under a finger. From the code.                                                                                                                    | Low      | Daily when Claude works | This week         | UX4  |
| 37  | This week's rows and the next-up card give no cue that they open anything.                                                                                                                                                               | Low      | Daily                   | This week         | UX4  |
| 38  | 28 links announce themselves as buttons (a `Button` rendering a `Link` with `nativeButton={false}`), so a screen reader, VoiceOver's list of links and Claude's own page snapshot misread them [4.1.2].                                  | Medium   | Daily                   | Everywhere        | UX18 |
| 39  | After a save, focus falls to the top of the page when its row leaves the list, and a button disabled while it saves drops focus even when the save fails [2.4.3]. From the code.                                                         | Medium   | Daily                   | This week, sheets | UX18 |
| 40  | Buttons repeat one name with nothing to tell them apart: Change, Accept, Dismiss, Log review, Mark stale, Delete [2.4.6].                                                                                                                | Low      | Daily                   | Everywhere        | UX18 |
| 41  | Forms don't tie help and errors to their fields, don't mark required ones, and leave focus on the button after a failed save; two inputs have no visible label; name fields keep autocorrect on [1.3.1, 3.3.2].                          | Low      | Weekly                  | Forms             | UX18 |
| 42  | The focus ring's halo is about 1.9:1 in light mode, and a focused input changes hue but not lightness [1.4.11].                                                                                                                          | Low      | Daily on the laptop     | Everywhere        | UX18 |
| 43  | The Delete label misses text contrast: 4.38:1 on the light page and 4.36:1 in the dark confirmation [1.4.3].                                                                                                                             | Low      | Rare                    | Record pages      | UX18 |
| 44  | On the laptop a collapsed sidebar keeps its links in the tab order, off-screen, and its toggle doesn't say whether it's open [2.4.7, 4.1.2].                                                                                             | Low      | Rare                    | Shell             | UX18 |
| 45  | How far a closed job got shows only in graphics hidden from screen readers [1.1.1].                                                                                                                                                      | Low      | Weekly                  | Status chip       | UX18 |
| 46  | Two targets miss the app's 44 px rule: the delete confirmation's close (28 px) and Add a job's company rows (about 40 px).                                                                                                               | Low      | Rare                    | Delete, Add a job | UX18 |
| 47  | Sheets, the dialog and the sidebar animate whatever the Reduce Motion setting says, which the design system's motion rule doesn't allow.                                                                                                 | Low      | Daily                   | Shared components | UX18 |

### Working well, keep

- This week's order (R9), with empty sections left out and the clear board that points at decisions waiting above.
- Saving against what was read (R22): a conflict keeps what was typed and names what changed.
- The status chip as a position, which reads the same in tables, cards and headers.
- R3's bookkeeping on the move itself (applied-on, the follow-up, a close's cleared step), and a repeated move that changes nothing.
- One-tap actions that refresh in place; logging a sent message to several people at once; the debrief in place.
- Touch targets of 44 px nearly everywhere, text that passes AA contrast in both modes (but for Delete), real headings, lists and description lists, errors announced with `role="alert"`, and inputs at 16 px on phones, so iOS doesn't zoom.
- Speed: on production, This week's first paint came at about 1.5 s on a full load, and moving between pages fetched in 60 to 170 ms.

### The jobs, now and after

| Job                        | Now                                                                                                                                                                                                                                                            | After the plan                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Clear what's due           | A step done: Change, retype the step, pick a date, Save, about 6 taps and typing. A person: the same, since Log sent alone leaves the row. A job's follow-up: its page, Contacts, Log, a contact, Save, about 8 taps; none for a portal. A push: about 5 taps. | Done or Push, then a chip: 2 to 3 taps, with undo.                                  |
| Log outreach               | From This week: menu, People, Log, type, pick, Save, about 6 taps, with no job link.                                                                                                                                                                           | Log in the top bar on every page; the person's jobs offered; about 4 taps.          |
| Decide a proposal          | Accept in 1 tap, but judging it means opening the job and coming back.                                                                                                                                                                                         | Level, band, reason and posting on the card; 1 to 2 taps.                           |
| Move a job on              | 2 taps, then the edit form to replace the old step.                                                                                                                                                                                                            | The stage control with the next step prefilled, on one screen.                      |
| Add a job at a new company | About 5 screens and 12 taps; a duplicate found only on save.                                                                                                                                                                                                   | One screen, the link first, about 6 taps.                                           |
| The Friday review          | The counts and two fields; the review itself happens outside the app.                                                                                                                                                                                          | Each count opens its records, beside last week's, with the pipeline and the closes. |

## Phase 1: Fixes first

Small and safe, shipped before the rest. One PR.

### UX1. Stop the two ways the daily loop writes wrong data

- **Fixes:** findings 1 and 2.
- **Do:**
  - Key the next-up card's action by its task. Make `useRecordForm` start over when its record's id changes, so no form can keep a stale record.
  - Set each default date (today in Eastern time) when its sheet or form opens, and again on submit if it wasn't changed: the quick log, the status move, a practice try.
- **Verify:** a screen test that swaps the card's task between renders and expects the sheet to open on, and save to, the new record (it fails before the fix); a test with the clock moved past midnight that expects the new day.
- **Touches:** UI only. **Size:** S.

### UX2. See where you are and what's picked

- **Fixes:** findings 3 to 5 and 33.
- **Do:**
  - A choice variant of the shared toggle in `packages/ui`, used by `FormField`. Its picked item fills with `primary`, as the design system's Field page says, carries a check mark so the fill isn't the only cue, and looks different from a hovered one. Picking the picked choice again keeps it. Other apps keep the current variant.
  - The menu becomes a small client component inside `<nav aria-label="Main">`. It marks the current item by path with `aria-current` and a mark that holds 3:1 (`hectors-tools`' sidebar sets the item by path), and on a phone it closes on a tap and has the 44 px close button every sheet has.
  - The top bar stays put as the page scrolls. On a phone it shows the section's name, as the design system's AppShell page says, and its button is labeled Menu. Sign out gets space above it.
  - Each section's page sets its title ("Jobs · Job search"); a record's page sets its section's name or the record's, as Q9 settles. Signed-out pages keep the bare name (R23).
    (Revised 2026-11-07 in UX2: the shell sets each page's title from its path, not the page's metadata. A metadata title was swapped a moment after the route changed, so on a return to the first page the tab loaded, Next's route announcer spoke the page left behind.)
- **Verify:** a picked choice holds at least 3:1 against an unpicked one in both themes; on a phone, a section is two taps away and the menu closes; the current item carries `aria-current`; a screen reader announces each page change.
- **Touches:** `packages/ui` (a new variant), the shell, each page's metadata. **Size:** S.

## Phase 2: The daily loop

The biggest change to how the app feels: every due task can be finished, or moved, where it's shown.

### UX3. Done and push on every due row

- **Fixes:** findings 6 to 9 and 34.
- **Do:**
  - Every sheet becomes a form: Save is its submit button, so the phone keyboard's Go and the laptop's Enter save; the buttons stick to the sheet's bottom above the keyboard; the header leaves room for the close button. The pattern goes into the app's UI Rules, and the other sheets take it when their units come.
  - A due row's sheet opens on two paths: **Done** and **Push**.
  - **Push** shows chips that save on tap: Tomorrow, In 3 days, Next Monday, In a week. The date field stays for any other day.
  - **Done** asks "What's next?", with the next step prefilled (Q2), the same chips for its date, or No next step.
  - A person's Done first asks how it went: Message sent, Reply or Conversation held. It logs that, then saves the step against the `updatedAt` the row read (R22), so the row always leaves or moves.
  - A job's Done offers **Follow-up sent**, with the job's contacts as one-tap chips. It logs a sent message linked to the job, so R3 moves the date and the week counts it. A follow-up with no one to name goes as Q3 decides.
  - The sheet's title is "Role · Company", its step a two-line text area, and Clear becomes No next step.
  - Mount a toaster once. Each action says what changed, with Undo where an existing action reverses it: the step and date put back, a logged interaction deleted.
- **Verify:** screen tests for each path; at 375 px, finishing a person's task takes three taps and a push two; a Done message counts in the week.
- **Touches:** `get_today`'s due jobs carry their contacts (a read). No new action: Done calls `logInteraction`, then `updateJob` or `updatePerson`. If Q5 changes when a late follow-up dates the next one, R3 is revised. **Size:** M.

### UX4. This week you can scan

- **Fixes:** findings 10 to 12, 36 and 37. Builds the design system's TaskRow and PitBoard as their pages describe.
- **Do:**
  - Due becomes "Due today and late", with counts in its heading, and its rows are grouped: Late, Today, Stale?, Reviews. Late shows its first few, then "Show all".
  - A row leads with its record in bold, marked as a job or a person, with the step under it and the due label on the right. The whole row is one tap that opens its sheet, with a chevron to say so, and the action's name says its record.
  - The minute's refresh waits while a sheet is open or a field has focus, and catches up when it closes (Q10).
  - Until the timing tower's pace data exists, the next-up card picks by company tier, then person rank, then date.
  - After Due come "Later this week" (collapsed, by weekday) and one line, "No date: n people, n jobs", linking to UX6's list.
  - The subtitle names today: "<weekday> · <week>".
  - A Claude session with no changes folds into one line.
- **Verify:** with about twenty tasks due on the test project, the page at 375 px is under half its length on 2026-11-06 (about 4,000 px); each group's count matches its rows.
- **Touches:** `get_today` adds steps due through Sunday and the undated counts (its answer grows; whether `TOOL_SET_VERSION` moves follows the app's Page Tools rule). R9 is revised for the two new lines, and R22 for the refresh that waits. **Size:** M.

### UX5. Log outreach from anywhere

- **Fixes:** findings 13 and 35.
- **Do:**
  - A Log button in the shell's top bar on every page. The sheet loads companies when it opens, through `findCompanies`, so the layout reads nothing more at request time.
    (Revised 2026-11-07 in UX5: the add form's company field searches `findCompanies` as it's typed, so no page reads every company for the log, and the sheet reads none unless a person is added. People's own Log went, since the top bar's is the same sheet.)
  - Matches show each person's company and role, and the search matches company names too. Once a person is picked, their jobs show as chips to link.
  - On a job's page, its contacts are one-tap picks.
  - A conversation can be logged ahead of time with its start and end, so Hector's own coffees reach the debrief list (the log already takes `scheduled`).
  - What happened, who, and Save stay on a phone's first screen. Date, job, note and next step fold under More, open whenever one is set. Job choices are full-width options whose text wraps, and on a laptop the sheet stops at a reading width.
    (Revised 2026-11-07 in UX5: the job's options show under who, outside More, whenever there's a job to link, since linking a sent message to an applied job moves its follow-up (R3) and a folded choice is easy to miss. More holds the date, note and next step, and opens when a save's answer names one of them.)
- **Verify:** from This week on a phone, logging a sent message to one person takes four taps or fewer.
- **Touches:** the quick log's line in the app's UI Rules. **Size:** M.

### UX6. The outreach backlog, dated

- **Fixes:** finding 14.
- **Do:**
  - People opens on its next steps: late, today, upcoming, then those with no date, rank A first within each, with a No date filter. Each undated row gets date chips that save in one tap.
  - Every sheet and form that takes a step gives it a date by default (Q1), and a job added with no step gets one too.
- **Verify:** every person with a step shows in one ordered list; a fixture job added with no step lands on This week on its default date.
- **Touches:** `find_people` takes the filter and the order, an input change, so `TOOL_SET_VERSION` and the registry test move. The default is a rule in the use cases; R1 and R7 are revised. **Size:** M.

### UX7. One pass over the imported next steps

- **Fixes:** finding 15. Owner C+H: real data.
- **Do:** Claude lists each imported step that holds a reason, with a short action, a date and the note the reason moves to. Hector OKs the batch. Claude writes it through page tools (`update_job`, `update_person`, `add_note`), so each change is logged as Claude's.
- **Verify:** Hector's OK is in the task; afterwards This week lists actions only.
- **Touches:** no code. **Size:** S, one session with Hector.

## Phase 3: Records

### UX8. Record pages that lead with what's next

- **Fixes:** findings 16 to 20. Builds the design system's RecordHeader.
- **Do:**
  - One order for a job, a person and a company: the record header (kind, who added it and when, name, facts line, status, actions); **Next**, with Done, Push and Change from UX3; interview rounds when U12 lands; contacts and outreach (a job's linked interactions, newest first); notes; facts, filled ones first and empty ones folded into one line, with the posting as "Open posting" and its domain; status moves; history.
  - The status picker moves behind a Move button (UX9).
  - A person's interactions show their notes, with a quiet delete that still asks first. A person's notes become dated entries, as a job's are (Q7).
  - A company leads with its jobs and people, with its facts folded, and its jobs table drops the Company column.
  - Back links name where you came from and return there: the link carries a `from` path, checked as `safe-redirect.ts` checks paths, and falls back to the section's list.
- **Verify:** at 375 px, a record's next step and its actions are on the first screen of its page.
- **Touches:** `get_job` reads the job's interactions (its answer grows). People's notes reuse the notes table, which points at a record by kind and id; confirm no migration is needed before building. **Size:** L.

### UX9. Moving a job, and what comes next

- **Fixes:** finding 21. Builds the design system's stage control.
- **Do:**
  - The stage control: Applied to Offer, the current stage marked, with Verify and Target before it. Close opens the reasons as chips for each closed status, plus free text.
  - A move shows the next step and date, prefilled for the new status, and saves them with it.
  - After a close, the job's contacts with a next step about it are listed, each with No next step.
- **Verify:** a move to Screen leaves no old "Follow up"; closing with a reason chip takes two taps.
- **Touches:** the client moves the job, then calls `updateJob` against the moved job's `updatedAt`, so no tool changes. **Size:** M.

### UX10. Values in words, said one way

- **Fixes:** findings 22 and 23.
- **Do:**
  - One formatter in `app/_lib` turns a field's value into words: the labels in `job-labels.ts`, `formatDay` for dates, dollars for pay. The history, the conflict notice and Claude's sessions use it.
  - One due label everywhere (Today, 2 days late, Tue). No year within the current year. "Tier 2" and "Rank A" everywhere, and one wording for adding things.
  - The timing tower names each row beside its code, changed first in the design system's TimingTower.
  - The `closed` status gets the label Q6 settles.
  - A record's "Created" entry shows a few fields and "Show all".
- **Verify:** a test walks every field of a fixture job's history and finds no raw value.
- **Touches:** UI only. **Size:** S.

## Phase 4: Claude's work and decisions

### UX11. Proposals decided from the card

- **Fixes:** finding 24.
- **Do:** the proposal card adds the level, the band in dollars, Claude's reason (two lines, with the rest a tap away) and Open posting. The fit checklist joins with U15.
- **Verify:** a screen test with a fixture proposal shows each field; Accept and Dismiss work as before.
- **Touches:** `get_today`'s proposals carry those fields (its answer grows). **Size:** S.

### UX12. Claude's changes you can check

- **Fixes:** finding 25.
- **Do:**
  - Each change names its record (a job's role and company, a person's name) and links to it, grouped by record, with the fields that changed in words (UX10).
  - Sessions with no changes fold away.
  - Claude's page leads with its activity, its tool list folded under "Page tools".
  - A close Claude made shows Reopen, Hector's alone: a move back to the status it left.
- **Verify:** a fixture session with a close shows the job named and linked, and Reopen restores its status.
- **Touches:** `list_activity` and `get_today` read each record's label (their answers grow). **Size:** M.

### UX13. Stale candidates and debriefs

- **Fixes:** findings 26 and 27.
- **Do:**
  - A stale row opens a sheet: Close as stale (with undo), Wait until a date (Q4), or Log a reply. The row shows when the last follow-up went.
  - The debrief card shows the person's current step and the linked job, and when the job is at applied, offers to move it to Screen with Held.
- **Verify:** a test for each choice; a waited candidate stays off the list until its date.
- **Touches:** if Q4 settles on a future next date holding off the flag, R3 is revised and nothing is stored; a stored date would be a migration. **Size:** M.

## Phase 5: The Friday review

### UX14. A weekly review you can do from the app

- **Fixes:** finding 28.
- **Do:** above the review's two fields:
  - each count beside last week's, opening the records it counted (names, days, links);
  - the pipeline by open status, with the week's moves;
  - proposals made, accepted and dismissed;
  - the week's closes, with their reasons;
  - a cleanup line: stale candidates, tasks late more than a week, steps with no date;
  - last week's one change, quoted;
  - past weeks as a list.
    `get_week` answers with the same, so Claude can run the review (F4) too. The ghost and best-ever marks come with the timing tower's pace data.
- **Verify:** for a fixture week, every record behind each count is listed and linked.
- **Touches:** `get_week` returns the counted records and the pipeline (its answer grows); each new read gets its parity entry (KTD16). **Size:** L.

## Phase 6: Lists and capture

### UX15. Lists that show what needs attention

- **Fixes:** findings 29 and 30. Builds the design system's RecordList.
- **Do:**
  - Jobs: role, company, status, next step, due (a column of its own, in `warning` when late) and source. Open gets stage chips with counts and a search. Closed shows the status it closed as, when and why; Dismissed shows why.
  - Phone cards put the due label on the right and the step on its own line. Long text wraps and clamps at two lines; no table scrolls sideways at 1280 px. A table that still can at a narrower width gets a focusable, labeled scroll region, so a keyboard reaches its hidden columns.
  - Companies: name, tier, open jobs, people. A column empty on every row is hidden.
  - People: name, company, rank, last in touch, next step and due, ordered by due.
- **Verify:** at 1280 px no table scrolls sideways; at 375 px every card shows its due label.
- **Touches:** `find_jobs` takes a search (`TOOL_SET_VERSION` and the registry test move); a closed job's date and reason are read from its status moves and their log rows; `find_companies`' answer carries the counts. **Size:** M.

### UX16. Add a job from its link

- **Fixes:** finding 31.
- **Do:** one page in the shell (forms stay pages, per the UI Rules):
  - the posting link first, checked for a duplicate as soon as it's pasted and linked to the job that holds it;
  - the company as a combobox that adds a new one by name inline;
  - the role, then the source, defaulting to the last one used;
  - "Already applied on <date>", which moves the new job;
  - the next step and date, defaulted (UX6);
  - the rest under "More details".
- **Verify:** a job at a new company is added from one page; a duplicate shows before saving.
- **Touches:** the duplicate check is a new read with its parity entry. **Size:** M.

## Phase 7: Practice and accessibility

### UX17. Practice that fits the loop

- **Fixes:** finding 32. Builds the design system's TaskRow for due reviews and its PracticeLadder.
- **Do:** type and pattern suggest earlier values; the review sheet shows the session's notes, folded; This week's practice count links to Log session; a session's page shows its review ladder.
- **Verify:** screen tests for the suggestions and the ladder.
- **Touches:** UI only. **Size:** S.

### UX18. What's left for screen readers and keyboards

- **Fixes:** findings 38 to 47. Each unit before it meets the definition of done for what it changes; this unit sweeps the rest.
- **Do:**
  - Links that look like buttons render as links styled with `buttonVariants`, and the screen tests that find them by role change with them.
  - When a save takes a row out of a list, focus moves to the next row or to the section's heading. A button keeps focus while its request runs (`focusableWhenDisabled`), still looking disabled. A shell-wide `role="status"` region carries the toaster's messages.
  - Repeated buttons keep their visible word and add their record for screen readers ("Change", then "next step: <record>"), so voice control still matches what's shown.
  - Forms point each field's `aria-describedby` at its help and error, mark required fields in their labels, focus the first invalid field after a failed save, label the two unlabeled inputs, and turn autocorrect off on name and company fields.
  - In `packages/ui`: a solid 2 px focus ring in `ring` with a 2 px gap; the destructive button's tint lightened until its label holds 4.5:1 in both modes; `motion-reduce:transition-none` on the sheet, the dialog and the sidebar; a collapsed sidebar made `inert`, with `aria-expanded` on its toggle.
  - The status chip says how far a closed job got ("reached Screen") to screen readers. The delete confirmation drops its 28 px close, since Cancel is there, and Add a job's company rows reach 44 px.
- **Verify:** VoiceOver on the iPhone and the laptop through the daily jobs; the keyboard alone on the laptop; contrast recomputed from the tokens for each changed pair.
- **Touches:** shared `packages/ui` components, which every app uses: check each app's screens that use them. **Size:** M.

## Open questions

Each is Hector's call, made before its unit is built and recorded here as decided, with its date. Claude's pick comes with each, where the evidence supports one. On 2026-11-07 Hector took Claude's pick on every question that had one, so each is marked decided below. Q6, which had none, is still open.

- **Q1. Should every next step carry a date?** (UX6) A step with no date never reaches This week. **Decided 2026-11-07:** yes, a week out by default when none is given; a step for someday becomes No next step with a note.
- **Q2. After a person's task is done, what's next by default?** (UX3) **Decided 2026-11-07:** "Follow up" in a week, changed with one tap.
- **Q3. Does a follow-up sent through a portal count as a message sent?** (UX3) Counting it means interactions without a person, a migration. **Decided 2026-11-07:** no; the job's date moves and a note records it, so the week's messages stay messages to people.
- **Q4. Does a future next date hold off a stale candidate?** (UX13) Yes is an R3 change with nothing stored; no needs a stored date, a migration. **Decided 2026-11-07:** yes.
- **Q5. Does a late follow-up date the next one from the day it went?** (UX3) Today R3 dates it from applied-on, so a late follow-up leaves its row late. **Decided 2026-11-07:** yes, a week from the day it went.
- **Q6. What does the `closed` status mean, and what should it be called?** (UX10) It shares its name with the tab that lists every closed job. Hector's meaning decides.
- **Q7. Should a person's notes become dated entries, with the imported text as the first one?** (UX8) **Decided 2026-11-07:** yes, as a job's are.
- **Q8. Where do the phases sit among U12 to U17?** **Decided 2026-11-07:** Phase 1 at once; Phase 2; then U17 (blocks), which adds to This week after UX4 has reshaped it; then Phases 3 to 7; then U12, U15, U13 and U14. Daily friction first, since it costs time every day; new sections after.
- **Q9. May a record's page title carry its name (a role, a company, a person)?** (UX2) It would show in the tab switcher and history on both devices, and in Claude's browser. **Decided 2026-11-07:** no, the section's name only ("Job · Job search"), since the search is discreet and a tab can be seen over a shoulder.
- **Q10. May This week's refresh wait while a sheet is open or a field has focus?** (UX4) R22 asks for a refresh at least once a minute; waiting while he types, then catching up, revises it. **Decided 2026-11-07:** yes.
- **Q11. Is a bottom tab bar worth a change to KTD19?** (after UX2) KTD19 names one as the remedy if the phone's menu costs too many taps. **Decided 2026-11-07:** not yet; UX2 brings a section to two taps, and a week of use with it decides.

## Definition of done: a UI unit

1. Checked in the browser pane at 375 px and on desktop, in light and dark mode, on the test project. Screenshots for the PR come from the test project, never production.
2. New touch targets are at least 44 × 44 px (the app's UI Rules).
3. Every control's name says what it acts on, a sheet returns focus to what opened it, and a save, a failure or an undo is announced, not only shown.
4. Reduced motion is respected.
5. The design system's piece is used as its page describes; a deviation is written back into the system.
6. `bun check --filter=job-search`, `bun ts --filter=job-search`, `bun run test --filter=job-search` and `bun run dead-code` pass, with screen tests for the changed behavior.
7. A new server action has a page tool or a human-only entry in the parity map (KTD16), and every write leaves its activity row (R19).
8. The app's AGENTS.md changes with any rule or pattern the unit adds.

## Conventions

- **Unit lines:** `- **UX<n>** Title — owner · needs`, with no state; the state is the task's.
- **Branches and commits:** one branch and PR per phase, `feat/job-search-ux-p<n>-<topic>`; one commit per unit, `feat(job-search): UX<n> <summary>`. Refer to PRs as `hectarek/hector-mono#n`.
- **Privacy:** R24 applies to every file, commit, screenshot and PR. The findings here describe the data in general terms only.
