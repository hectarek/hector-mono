"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  type ActionState,
  actionLogger,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";

// A loan's move shows on Loans, the loan's page, the game's page and every library card of the
// copy, and in the tabs' counts and the bell (KTD16), so each revalidates the whole app. The page
// that sent it renders again with the move made (docs/solutions/ui-bugs, revalidatePath).
function revalidateEverything(): void {
  revalidatePath("/", "layout");
}

// The names in these messages come from the screen that sent them: they only say what happened
// to the person who tapped.

// Ask to borrow's Send request (C1).
export async function requestLoan(
  userGameId: string,
  note: string,
  ownerName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IRequestLoanController")({ userGameId, note }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("requestLoan"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return { message: `Request sent to ${ownerName}.` };
}

// Withdraw my request (C16), after "Withdraw your request for Quarry Lane?". Its dialog goes on to
// Loans.
export async function withdrawRequest(loanId: string): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IWithdrawRequestController")({ loanId }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("withdrawRequest"),
      "Couldn’t withdraw it. Try again.",
    );
  }
  revalidateEverything();
  return { message: "Request withdrawn." };
}

// C2's answer: yes for a period or until a date, or no, with a note that may be empty.
export type RequestAnswerInput = { note: string } & (
  | { answer: "yes"; periodDays: number }
  | { answer: "yes"; dueOn: string }
  | { answer: "no" }
);

// C2's Send answer. A yes stays on the loan's page, which now reads as C17; a no goes on to Loans.
export async function answerRequest(
  loanId: string,
  answer: RequestAnswerInput,
  borrowerName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IAnswerRequestController")(
      { loanId, ...answer },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("answerRequest"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return {
    message: `You said ${answer.answer}. ${borrowerName} is told.`,
  };
}

// Cancel this loan (C17) or I can't pick it up after all (C3), after "Cancel this loan?". Its
// dialog goes on to Loans.
export async function cancelLoan(
  loanId: string,
  otherName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("ICancelLoanController")({ loanId }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("cancelLoan"),
      "Couldn’t cancel it. Try again.",
    );
  }
  revalidateEverything();
  return { message: `Loan cancelled. ${otherName} is told.` };
}
