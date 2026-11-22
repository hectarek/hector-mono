import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import {
  type CopyState,
  copyState,
  type LoanStatus,
  OPEN_STATUSES,
} from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import type { Loan } from "@/src/entities/models/loan.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IGetLoanUseCase = ReturnType<typeof getLoanUseCase>;

export type LoanPage = {
  loan: Loan;
  // Who the member looking is to the loan.
  role: "owner" | "borrower";
  copy: UserGame;
  game: Game;
  // The other person: their name and piece, and their phone while the loan is open (R40).
  other: NameAndPiece & { phone: string | null };
  // The copy as the owner sees it, for where the request stands: the owner answers the first in
  // line while the copy is home.
  copyState: CopyState<Loan>;
};

const open: readonly LoanStatus[] = OPEN_STATUSES;

// A loan's page (C2, C3, C16, C17): only its copy's owner and its borrower see it, and anyone else
// gets the Not found a stranger gets (D4, AE8), the admin included. Each read waits for the one
// before (KTD2).
export const getLoanUseCase = (
  loansRepository: ILoansRepository,
  userGamesRepository: IUserGamesRepository,
  gamesRepository: IGamesRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (
    loanId: string,
    viewerId: string,
    today: string,
  ): Promise<LoanPage> => {
    const loan = await loansRepository.getById(loanId);
    const copy = loan && (await userGamesRepository.getById(loan.userGameId));
    if (!loan || !copy) {
      throw new NotFoundError();
    }
    const role =
      copy.userId === viewerId
        ? "owner"
        : loan.borrowerUserId === viewerId
          ? "borrower"
          : null;
    if (!role) {
      throw new NotFoundError();
    }
    const game = await gamesRepository.getById(copy.gameId);
    const other = await userProfilesRepository.getByUserId(
      role === "owner" ? loan.borrowerUserId : copy.userId,
    );
    if (!game || !other) {
      throw new NotFoundError();
    }
    const loans = await loansRepository.listOpenForCopies([copy.id]);
    return {
      loan,
      role,
      copy,
      game,
      other: {
        userId: other.userId,
        name: other.name,
        pieceShape: other.pieceShape,
        pieceColor: other.pieceColor,
        phone: open.includes(loan.status) ? other.phone : null,
      },
      copyState: copyState(copy, loans, copy.userId, today),
    };
  };
};
