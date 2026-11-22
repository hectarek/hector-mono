import { connection } from "next/server";
import { AppHeader } from "@/app/_components/app-header";
import { Group } from "@/app/_components/group";
import { PageColumn } from "@/app/_components/page-column";
import { SavedSwitch } from "@/app/_components/saved-switch";
import { gate } from "@/app/_lib/account";
import { setNoticeGroup } from "@/app/actions/notices";
import { getInjection } from "@/di/container";
import type { NoticeGroup } from "@/src/entities/notice-types";

// E7's switches, in its panels and order, with its words.
const PANELS: {
  label: string;
  switches: { group: NoticeGroup; label: string; help?: string }[];
}[] = [
  {
    label: "Loans",
    switches: [
      {
        group: "due-date-reminders",
        label: "Due-date reminders",
        help: "Two days before, and the morning it’s due.",
      },
      {
        group: "overdue-reminders",
        label: "Overdue reminders",
        help: "Every three days until it’s back.",
      },
      { group: "requests-on-my-games", label: "Requests on my games" },
      { group: "answers-to-my-requests", label: "Answers to my requests" },
      {
        group: "line-updates",
        label: "The line",
        help: "Someone joins a line for a game I have, or my turn comes up.",
      },
      {
        group: "pick-ups-and-returns",
        label: "A pick-up or a return to confirm",
      },
      { group: "more-time-requests", label: "More-time requests" },
    ],
  },
  {
    label: "Friends",
    switches: [{ group: "friend-requests", label: "Friend requests" }],
  },
  {
    label: "Game nights",
    switches: [
      { group: "night-invites", label: "Invites" },
      { group: "night-changes", label: "Changes and cancellations" },
      { group: "waitlist-seats", label: "A seat opening for me on a waitlist" },
      {
        group: "night-mornings",
        label: "A reminder the morning of a game night",
      },
    ],
  },
  {
    label: "Games you suggested",
    switches: [
      { group: "suggestion-answers", label: "What happened to my suggestion" },
    ],
  },
];

// Notices I get (E7; R28): thirteen switches, each saved as it flips. A group switched off stops
// showing in the inbox and the bell; its notices are still written, and the tabs' counts stay.
export default async function NoticesPage() {
  await connection();
  const { user } = await gate("app");
  const off = new Set(
    await getInjection("IGetNoticeSettingsController")(user.id),
  );

  return (
    <PageColumn
      width="read"
      header={<AppHeader back={{ href: "/you", label: "You" }} />}
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl leading-7 font-bold">Notices I get</h1>
        <p className="text-13 leading-snug text-muted-foreground">
          These show up in your inbox, inside the app. Nothing is sent to your
          phone or email yet. Switch one off and it stops showing in the inbox;
          the red counts on the tabs stay.
        </p>
      </div>
      {PANELS.map((panel) => (
        <Group key={panel.label} label={panel.label}>
          <div className="flex flex-col gap-2">
            {panel.switches.map(({ group, label, help }) => (
              <SavedSwitch
                key={group}
                label={label}
                help={help}
                on={!off.has(group)}
                save={setNoticeGroup.bind(null, group)}
              />
            ))}
          </div>
        </Group>
      ))}
      <p className="text-xs text-muted-foreground">Saved as you switch.</p>
    </PageColumn>
  );
}
