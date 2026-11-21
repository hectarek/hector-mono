// What a member is told (docs/data-model.md, Notices; R25 to R28): every notice type, and the
// group of Notices I get (E7) each belongs to, or none, when it always shows.

// E7's groups, in its order. line-updates is E7's "The line".
export const NOTICE_GROUPS = [
  "due-date-reminders",
  "overdue-reminders",
  "requests-on-my-games",
  "answers-to-my-requests",
  "line-updates",
  "pick-ups-and-returns",
  "more-time-requests",
  "friend-requests",
  "night-invites",
  "night-changes",
  "waitlist-seats",
  "night-mornings",
  "suggestion-answers",
] as const;
export type NoticeGroup = (typeof NOTICE_GROUPS)[number];

// Every group starts on except the morning-of-a-night reminder, as E7 draws them: a new member's
// user_settings.notices_off.
export const DEFAULT_NOTICES_OFF: readonly NoticeGroup[] = ["night-mornings"];

// In data-model.md's order. return-closed and pass-along-taken-back are Claude's additions there.
export const NOTICE_TYPES = [
  "loan-requested",
  "line-joined",
  "request-withdrawn",
  "request-accepted",
  "request-declined",
  "turn-in-line",
  "loan-cancelled",
  "loan-recorded",
  "return-to-confirm",
  "return-not-confirmed",
  "return-closed",
  "pass-along-to-confirm",
  "pass-along-taken-back",
  "passed-along",
  "more-time-asked",
  "more-time-answered",
  "due-date-changed",
  "called-back",
  "due-soon",
  "due-today",
  "due-back-today",
  "overdue",
  "friend-request",
  "night-invite",
  "night-changed",
  "night-cancelled",
  "waitlist-seat",
  "removed-from-waitlist",
  "night-today",
  "suggestion-answered",
  "suggestion-arrived",
] as const;
export type NoticeType = (typeof NOTICE_TYPES)[number];

// A group switched off hides its types from the inbox and the bell's count; a type with no
// group always shows. Its notices are written either way (E7).
export const NOTICE_TYPE_GROUPS: Record<NoticeType, NoticeGroup | null> = {
  "loan-requested": "requests-on-my-games",
  "line-joined": "line-updates",
  "request-withdrawn": null,
  "request-accepted": "answers-to-my-requests",
  "request-declined": "answers-to-my-requests",
  "turn-in-line": "line-updates",
  "loan-cancelled": null,
  "loan-recorded": null,
  "return-to-confirm": "pick-ups-and-returns",
  "return-not-confirmed": null,
  "return-closed": null,
  "pass-along-to-confirm": "pick-ups-and-returns",
  "pass-along-taken-back": null,
  "passed-along": null,
  "more-time-asked": "more-time-requests",
  "more-time-answered": "more-time-requests",
  "due-date-changed": null,
  "called-back": null,
  "due-soon": "due-date-reminders",
  "due-today": "due-date-reminders",
  "due-back-today": "due-date-reminders",
  overdue: "overdue-reminders",
  "friend-request": "friend-requests",
  "night-invite": "night-invites",
  "night-changed": "night-changes",
  "night-cancelled": "night-changes",
  "waitlist-seat": "waitlist-seats",
  "removed-from-waitlist": null,
  "night-today": "night-mornings",
  "suggestion-answered": "suggestion-answers",
  "suggestion-arrived": null,
};
