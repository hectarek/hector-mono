// The ready messages the app hands the phone's share sheet (KTD18, R52), with the link beside
// them.

// E2's Share: your friend link, for the group chat.
export const FRIEND_LINK_MESSAGE =
  "Be my friend on Community Game Library, so we can see each other’s board games:";

// C18's Text Jo too, after calling a game back: the borrower sees the notice only when they next
// open the app.
export const callBackMessage = (title: string) =>
  `Could you bring ${title} back? I need it.`;

// D7's and D10's Share: a night's link, for the people the host wants there.
export const nightLinkMessage = (title: string) =>
  `You’re invited to ${title} on Community Game Library. See it and answer here:`;
