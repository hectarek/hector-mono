import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";

export type IMarkInboxReadUseCase = ReturnType<typeof markInboxReadUseCase>;

// The inbox marks what it listed as read once it's open (R27), which clears the bell. Only those:
// a notice that came after the page was drawn, or one a switched-off group hides, stays unread.
// It's sent from the page, so a prefetch of the inbox clears nothing.
export const markInboxReadUseCase = (
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
) => {
  return async (
    noticeIds: readonly string[],
    userId: string,
  ): Promise<void> => {
    await transactionManagerService.startTransaction((tx) =>
      noticesRepository.markRead(userId, noticeIds, tx),
    );
  };
};
