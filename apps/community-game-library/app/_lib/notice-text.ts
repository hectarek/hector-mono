import { FRIEND_TEXTS } from "@/app/_lib/notice-text/friends";
import { LOAN_TEXTS } from "@/app/_lib/notice-text/loans";
import { NIGHT_TEXTS } from "@/app/_lib/notice-text/nights";
import { SUGGESTION_TEXTS } from "@/app/_lib/notice-text/suggestions";
import type {
  NoticeReader,
  NoticeTexts,
  NoticeWords,
} from "@/app/_lib/notice-text/words";
import type { InboxNotice } from "@/src/entities/models/notice.model";
import type { NoticeType } from "@/src/entities/notice-types";

// Every notice type's words, one place per area (KTD7): a type with no words here fails the
// build, since this record must name all of them.
const TEXTS: NoticeTexts<NoticeType> = {
  ...LOAN_TEXTS,
  ...NIGHT_TEXTS,
  ...FRIEND_TEXTS,
  ...SUGGESTION_TEXTS,
};

// A notice's inbox line, its link and its stamp (F1).
export function noticeText(
  item: InboxNotice,
  reader: NoticeReader,
): NoticeWords {
  return TEXTS[item.notice.type](item, reader);
}
