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
  // The member looking, by name and piece: the borrower's piece stands on C5's track.
  you: NameAndPiece;
  // The people in the copy's line, in order, by name and piece, with their requests (C5's Who's
  // involved, C7's The line): they needn't be the member's friends.
  line: (NameAndPiece & { loanId: string; askedAt: Date })[];
  // The other borrower in a pass-along (R48): to the giver, the friend they hand it to now (the
  // first in line, while the copy's switch is on and it hasn't been called back), are handing it to,
  // or handed it to; to that friend, the giver. Their phone shows while the handoff is open, friends
  // or not.
  handoff: (NameAndPiece & { phone: string | null; loanId: string }) | null;
};

const open: readonly LoanStatus[] = OPEN_STATUSES;

// A loan's page (C2, C3, C5, C7, C11, C16, C17): only its copy's owner and its borrower see it, and
// anyone else gets the Not found a stranger gets (D4, AE8), the admin included. Each read waits for
// the one before (KTD2).
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
    const state = copyState(copy, loans, copy.userId, today);
    const people = new Map(
      (
        await userProfilesRepository.getManyByUserIds([
          viewerId,
          ...state.line.map((one) => one.borrowerUserId),
        ])
      ).map((person) => [person.userId, person]),
    );
    const you = people.get(viewerId);
    if (!you) {
      throw new NotFoundError();
    }
    const handoffLoan = await handoffOf(loan, copy, loans, state.line);
    const handoffPerson =
      handoffLoan &&
      (await userProfilesRepository.getByUserId(handoffLoan.borrowerUserId));
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
      copyState: state,
      you,
      line: state.line.flatMap((one) => {
        const person = people.get(one.borrowerUserId);
        return person
          ? [{ ...person, loanId: one.id, askedAt: one.createdAt }]
          : [];
      }),
      handoff:
        handoffLoan && handoffPerson
          ? {
              userId: handoffPerson.userId,
              name: handoffPerson.name,
              pieceShape: handoffPerson.pieceShape,
              pieceColor: handoffPerson.pieceColor,
              phone: open.includes(loan.status) ? handoffPerson.phone : null,
              loanId: handoffLoan.id,
            }
          : null,
    };
  };

  // The loan at the other end of a pass-along, if there is one (LoanPage's handoff).
  async function handoffOf(
    loan: Loan,
    copy: UserGame,
    loans: readonly Loan[],
    line: readonly Loan[],
  ): Promise<Loan | undefined> {
    switch (loan.status) {
      case "accepted":
        return loan.previousLoanId === null
          ? undefined
          : loans.find((one) => one.id === loan.previousLoanId);
      case "out":
        return copy.passAlong && loan.calledBackAt === null
          ? line[0]
          : undefined;
      case "passing":
        return loans.find((one) => one.previousLoanId === loan.id);
      case "passed-along":
        return (await loansRepository.listHistoryForCopy(copy.id)).find(
          (one) => one.previousLoanId === loan.id,
        );
      default:
        return undefined;
    }
  }
};
