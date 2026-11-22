import {
  actorOf,
  type NoticeTexts,
  quoted,
  words,
} from "@/app/_lib/notice-text/words";
import type { InboxNotice } from "@/src/entities/models/notice.model";

const titleOf = (item: InboxNotice) => item.suggestion?.title ?? "a game";

// Suggestions (R4, R26): the member who suggested a game hears what happened, and it opens the
// game once there is one; the admin hears one has arrived, and it opens the suggestion (G2).
export const SUGGESTION_TEXTS: NoticeTexts<
  "suggestion-answered" | "suggestion-arrived"
> = {
  "suggestion-answered": (item) => {
    const { suggestion } = item;
    const href = suggestion?.gameId
      ? `/games/${suggestion.gameId}`
      : "/my-library";
    if (suggestion?.status === "declined") {
      return words(`${titleOf(item)} wasn’t added to the catalog`, href, {
        detail: quoted(item.notice.answerNote),
      });
    }
    return words(
      suggestion?.status === "already-here"
        ? `${titleOf(item)} was in the catalog already`
        : `${titleOf(item)} is in the catalog`,
      href,
      { detail: "It’s in your library." },
    );
  },
  "suggestion-arrived": (item) =>
    words(
      `${actorOf(item)} suggested ${titleOf(item)}`,
      item.suggestion ? `/admin/suggestions/${item.suggestion.id}` : "/admin",
      {
        detail: "A game to add to the catalog.",
        stamp: { word: "New", tone: "red" },
      },
    ),
};
