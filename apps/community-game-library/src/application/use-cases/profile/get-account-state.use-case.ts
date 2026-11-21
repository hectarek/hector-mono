import type { IRemovedUsersRepository } from "@/src/application/repositories/removed-users.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { AccountState } from "@/src/entities/account-state";

export type IGetAccountStateUseCase = ReturnType<typeof getAccountStateUseCase>;

export const getAccountStateUseCase = (
  removedUsersRepository: IRemovedUsersRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (userId: string): Promise<AccountState> => {
    if (await removedUsersRepository.isRemoved(userId)) {
      return { state: "removed" };
    }
    const profile = await userProfilesRepository.getByUserId(userId);
    if (!profile) {
      return { state: "needs-profile" };
    }
    return {
      state: "ready",
      me: {
        userId: profile.userId,
        name: profile.name,
        pieceShape: profile.pieceShape,
        pieceColor: profile.pieceColor,
      },
    };
  };
};
