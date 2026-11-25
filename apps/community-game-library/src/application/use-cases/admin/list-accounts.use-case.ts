import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { ISignInsRepository } from "@/src/application/repositories/sign-ins.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IRequireAdmin } from "@/src/application/use-cases/admin/require-admin";
import { isUnsettled } from "@/src/entities/loan";
import type { UserProfile } from "@/src/entities/models/user-profile.model";

export type IListAccountsUseCase = ReturnType<typeof listAccountsUseCase>;

// An account the admin's search found (G8): who it is, the email it signs in with (none when its
// sign-in has none), when it joined, its games, and its unsettled loans, which keep it from being
// removed.
export type FoundAccount = {
  profile: Pick<
    UserProfile,
    "userId" | "name" | "pieceShape" | "pieceColor" | "createdAt"
  >;
  email: string | null;
  games: number;
  openLoans: number;
};

// The most accounts one search shows: a narrower search finds the rest.
const FOUND_LIMIT = 10;

// Find the account (G8, R41): every member whose name holds the search, by name, the admin's own
// account left out, each with the email it signs in with (Hector, 2026-11-25), read from their
// sign-ins at once. Only the admin reads it: the emails too. An empty search finds nobody.
export const listAccountsUseCase = (
  requireAdmin: IRequireAdmin,
  userProfilesRepository: IUserProfilesRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  signInsRepository: ISignInsRepository,
) => {
  return async (search: string, adminId: string): Promise<FoundAccount[]> => {
    requireAdmin(adminId);
    const words = search.trim().toLocaleLowerCase("en-US");
    if (!words) {
      return [];
    }
    const found = (await userProfilesRepository.listAll())
      .filter(
        (profile) =>
          profile.userId !== adminId &&
          profile.name.toLocaleLowerCase("en-US").includes(words),
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name, "en-US") ||
          (a.userId < b.userId ? -1 : 1),
      )
      .slice(0, FOUND_LIMIT);
    const emails = new Map(
      (
        await signInsRepository.listEmails(
          found.map((profile) => profile.userId),
        )
      ).map((signIn) => [signIn.userId, signIn.email]),
    );
    const accounts: FoundAccount[] = [];
    for (const { userId, name, pieceShape, pieceColor, createdAt } of found) {
      const copies = await userGamesRepository.listOwn(userId);
      const loans = [
        ...(await loansRepository.listOpenForBorrower(userId)),
        ...(await loansRepository.listOpenForCopies(
          copies.map((copy) => copy.id),
        )),
      ];
      accounts.push({
        profile: { userId, name, pieceShape, pieceColor, createdAt },
        email: emails.get(userId) ?? null,
        // Games, not copies: a second copy of a game counts once.
        games: new Set(copies.map((copy) => copy.gameId)).size,
        openLoans: loans.filter(isUnsettled).length,
      });
    }
    return accounts;
  };
};
