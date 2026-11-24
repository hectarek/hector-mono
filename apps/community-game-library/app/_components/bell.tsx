import Link from "next/link";
import { BellIcon } from "@/app/_components/icons";
import { TabCount } from "@/app/_components/tab-count";

// The inbox opens from the bell, top right beside the member's piece (D14), with the count of
// unread lines. U11 gives it the count; until then it has none.
export function Bell({
  unread = 0,
  on,
}: {
  unread?: number;
  on: "kraft" | "chipboard";
}) {
  return (
    <Link
      href="/inbox"
      transitionTypes={["go-deeper"]}
      aria-label={unread > 0 ? `Inbox, ${unread} unread` : "Inbox"}
      className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-foreground bg-secondary text-foreground hover:text-destructive"
    >
      <BellIcon className="col-start-1 row-start-1" />
      <TabCount
        count={unread}
        on={on === "kraft" ? "bell-on-kraft" : "bell-on-chipboard"}
      />
    </Link>
  );
}
