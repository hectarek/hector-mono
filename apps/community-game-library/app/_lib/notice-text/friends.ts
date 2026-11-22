import { actorOf, type NoticeTexts, words } from "@/app/_lib/notice-text/words";

// A friend request (R49) opens Friends, where it's answered (E1).
export const FRIEND_TEXTS: NoticeTexts<"friend-request"> = {
  "friend-request": (item) =>
    words(`${actorOf(item)} wants to be friends`, "/friends", {
      stamp: { word: "Asked you", tone: "red" },
    }),
};
