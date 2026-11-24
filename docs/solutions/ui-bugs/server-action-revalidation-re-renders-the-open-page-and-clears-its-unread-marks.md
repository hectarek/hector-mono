---
title: "A server action's revalidatePath re-renders the page that sent it, which cleared the inbox's unread marks and a catalog row's Added"
date: 2026-11-22
last_updated: 2026-11-24
category: ui-bugs
module: "apps/community-game-library, and any app here whose page changes, through its own server action, the state it is showing"
problem_type: ui_bug
component: frontend
symptoms:
  - "The inbox's red dots and its 2 unread line were gone 1.5 s after it opened, before anyone could read them"
  - "The bell read 2 unread on the page before, so the notices had been unread when the inbox rendered"
  - "Every screen test passed, the inbox's included"
  - "On Add games, a row's Added stamp and its Undo turned to Yours about half a second after I own it"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
framework_version: "next 16.4.6, react 19.3.1"
related_components: [testing_framework]
tags: [nextjs, server-actions, revalidatepath, unread, inbox, client-state, happy-dom, catalog-row, i-own-it]
---

# A server action's revalidatePath re-renders the page that sent it, which cleared the inbox's unread marks and a catalog row's Added

## Problem

`apps/community-game-library`'s inbox (F1, `apps/community-game-library/app/(main)/inbox/page.tsx`) is a Server Component that marked each notice whose `read_at` was null with a red dot and a screen-reader "Unread.", under an "N unread" line. Its client part (`apps/community-game-library/app/(main)/inbox/mark-read.tsx`) called the server action `markInboxRead` once the page was open, never on the page's own load, so a prefetch marks nothing read. The action marked the notices read and called `revalidatePath("/", "layout")`, so the bell in the `(main)` layout would clear. The marks vanished as soon as the action returned, so a member never saw which notices were new.

## Symptoms

- On the dev server on 2026-11-22, a Playwright check waited for the inbox, then took a screenshot 1.5 s later: the rows had no "Unread." and no dot, and the "2 unread" line was missing.
- The bell had read "Inbox, 2 unread" on the page opened just before, so the notices were unread when the inbox rendered.
- The screen tests passed, including the inbox's, which checked "2 unread" on its first render.

## What Didn't Work

- Trusting the screen tests. The test preload stubs `next/cache` (`apps/community-game-library/tests/_support/preload.ts`), so `revalidatePath` re-renders nothing there and the page keeps its first render. Only the dev server showed the refresh.
- Ruled out without trying: not revalidating. Next keeps a shared layout through a client navigation: its docs on authentication note that layouts "don't re-render on navigation", because of partial rendering. The bell lives in the `(main)` layout, so it would have kept its count until something else refreshed it.
- Ruled out without trying: marking read while the page renders. A server render also runs for link previews and prefetches (`docs/solutions/runtime-errors/partial-prefetching-runs-page-reads-that-fail-in-production.md`), so it would mark notices read that nobody opened.

## Solution

Keep what was new in client state that outlives the refresh, and mark read only what the page listed:

```tsx
// apps/community-game-library/app/(main)/inbox/mark-read.tsx
const WasNew = createContext<ReadonlySet<string>>(new Set());

export function MarkInboxRead({
  unreadIds,
  children,
}: {
  unreadIds: readonly string[];
  children: ReactNode;
}) {
  const [wasNew] = useState(() => new Set(unreadIds));
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || wasNew.size === 0) return;
    sent.current = true;
    void callAction(() => markInboxRead([...wasNew]));
  }, [wasNew]);
  return <WasNew value={wasNew}>{children}</WasNew>;
}

export function IfNew({ id, children }: { id: string; children: ReactNode }) {
  return use(WasNew).has(id) ? children : null;
}
```

The page wraps its list in `<MarkInboxRead unreadIds={...}>`, draws the dot and the screen-reader text inside `<IfNew id={notice.id}>`, and the count with `<UnreadCount />`, which reads the same set. The action now takes the ids (`INoticesRepository.markRead(userId, noticeIds, tx)`, which replaced `markAllRead`), so a notice that arrived after the page was drawn, or one hidden by a group the member switched off, stays unread.

The inbox's screen test (`apps/community-game-library/tests/app/(main)/inbox/page.test.tsx`) stands in for the refresh: after the action, `view.rerender(await InboxPage())` renders the page again from the server with both notices read, and the test expects "2 unread" and both "Unread." marks to stay. The old page worked its marks out from `read_at`, so that rerender had none. On the dev server, the marks were still there 5 s after the inbox opened, the bell cleared at once, and the next visit showed none.

## Why This Works

`revalidatePath` called in a Server Function "Updates the UI immediately (if viewing the affected path)" (Next.js 16.4.6's [revalidatePath reference](https://nextjs.org/docs/app/api-reference/functions/revalidatePath), bundled after `bun install` at `apps/community-game-library/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`). `"/"` with `"layout"` covers every page, the open one included, so the action's response carried the inbox rendered again with every notice read, and the server-computed marks went with it.

When the server renders the page again, React reconciles the new tree into the old one. `MarkInboxRead` sits at the same place, so it keeps its state: `useState`'s initializer ran once, on the first render, and the new `unreadIds` prop (now empty) doesn't replace it. The marks drawn from that state last until the member leaves the page.

## A second case: the refresh unmounts a client part that a server prop swaps out (2026-11-24)

Client state outlives the refresh only while its component stays at the same place in the tree. On Add games (B8), `CatalogRow` (`apps/community-game-library/app/_components/game-row.tsx`) chose between a static stamp and the client part from a server prop:

```tsx
// Before: `yours` comes from the server.
yours ? (
  <span className="shrink-0">
    <Stamp tone="navy">Yours</Stamp>
  </span>
) : (
  <IOwnIt gameId={game.id} />
)
```

`IOwnIt` (`apps/community-game-library/app/_components/i-own-it.tsx`) keeps the added copy in `useState` and shows the Added stamp with Undo under it. Its action, `addCopy` (`apps/community-game-library/app/actions/copies.ts`), calls `revalidatePath` on `/`, `/my-library` and the game's page. `/my-library/add` isn't among them, but the open page rendered again anyway: when `revalidatePath` runs in an action, Next.js "re-renders the current route server-side" and sends it with the action's result (Next.js 16.4.6's server actions guide, bundled at `apps/community-game-library/node_modules/next/dist/docs/01-app/02-guides/server-actions.md`). The new render had `yours` true, so `CatalogRow` put the Yours span where `IOwnIt` had been. `IOwnIt` unmounted, its state went with it, and the row's Added and Undo turned to Yours about half a second after the tap. A Playwright check on the dev server found it: the locator for Added timed out, and the page snapshot showed the row stamped Yours. The screen tests had passed, for the same reason as the inbox's.

The fix keeps `IOwnIt` in the row in every state and gives it the server's value to read:

```tsx
// apps/community-game-library/app/_components/game-row.tsx
<IOwnIt gameId={game.id} yours={yours} />

// apps/community-game-library/app/_components/i-own-it.tsx, after the Added branch
if (yours) {
  return (
    <span className="shrink-0">
      <Stamp tone="navy">Yours</Stamp>
    </span>
  );
}
```

`IOwnIt` shows Added and Undo while its own state holds the added copy, then Yours for a game the member already owned, then the I own it button. The refresh changes only its `yours` prop, so it keeps its state. Its screen test (`apps/community-game-library/tests/app/(main)/my-library/add/page.test.tsx`, "keeps Added and Undo through the add's refresh") taps I own it, waits for the copy to be saved, renders the page again into the same root with `view.rerender`, and expects Added and Undo, and no Yours, before tapping Undo.

## Prevention

- A page whose own server action changes the state it shows (marking read on open, a seen-at time, a dismissal) keeps whatever should outlive the change in client state, since the action's `revalidatePath` re-renders that page. `apps/community-game-library/AGENTS.md` says so in U11's patterns.
- Keep that client part rendered in every state the action can lead to, and pass it the server's value as a prop it reads. A server prop that swaps it for another element unmounts it, and its state goes with it. `apps/community-game-library/AGENTS.md` says so under Testing.
- Check such a page on the dev server after its action runs. Screen tests here stub `next/cache`; a test can stand in for the refresh with `rerender` and the page's fresh render.
- Send the ids the page showed rather than marking "everything": the page's view is what the member saw.

## Related Issues

- `docs/solutions/runtime-errors/partial-prefetching-runs-page-reads-that-fail-in-production.md`: why the marking waits for the page to open.
- `docs/solutions/ui-bugs/form-action-reset-puts-a-controlled-select-back-to-its-default-option.md`: another way a finished action changed what a page showed, which happy-dom alone could miss.
