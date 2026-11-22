"use client";

import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useRef,
  useState,
} from "react";
import { callAction } from "@/app/_lib/call-action";
import { markInboxRead } from "@/app/actions/notices";

const WasNew = createContext<ReadonlySet<string>>(new Set());

// Marks what the inbox listed as read once it's open (R27). The action refreshes the page with
// them read, and the bell clears at once, so this keeps what was new when the inbox opened marked
// until the member leaves. A prefetch never runs this.
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

// What a notice shows only while it was new when the inbox opened.
export function IfNew({ id, children }: { id: string; children: ReactNode }) {
  return use(WasNew).has(id) ? children : null;
}

// F1's "2 unread": how many were new when the inbox opened.
export function UnreadCount() {
  const count = use(WasNew).size;
  return count > 0 ? (
    <p className="font-mono text-xs font-medium text-muted-foreground">
      {count} unread
    </p>
  ) : null;
}
