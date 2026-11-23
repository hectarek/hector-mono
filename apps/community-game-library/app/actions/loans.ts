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

// Ask to borrow's Send request (C1), or Join the line (C10, and C1's next step once the copy was
// just lent). The game's page then reads "You asked" or the place in line.
export async function requestLoan(
  userGameId: string,
  note: string,
  ownerName: string,
  join = false,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IRequestLoanController")(
      { userGameId, note, join },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("requestLoan"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return {
    message: join
      ? `You joined the line. ${ownerName} is told.`
      : `Request sent to ${ownerName}.`,
  };
}

// Leave the line (B13, C16), after "Leave the line for Fenwick Fair?": the request is withdrawn.
export async function leaveLine(loanId: string): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IWithdrawRequestController")({ loanId }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("leaveLine"),
      "Couldn’t leave the line. Try again.",
    );
  }
  revalidateEverything();
  return { message: "You left the line." };
}

// Remove from line (C7), after "Take Ben out of the line?", with an optional note: the owner's no
// to that request.
export async function removeFromLine(
  loanId: string,
  note: string,
  borrowerName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IAnswerRequestController")(
      { loanId, answer: "no", note },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("removeFromLine"),
      "Couldn’t remove them. Try again.",
    );
  }
  revalidateEverything();
  return {
    message: `${borrowerName} is out of the line. ${borrowerName} is told.`,
  };
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

// C3's I've picked it up, and C17's Priya has it, with the day. The page then reads as C5 or C7.
export async function confirmPickUp(
  loanId: string,
  pickedUpOn: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IConfirmPickUpController")(
      { loanId, pickedUpOn },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("confirmPickUp"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return { message: "The loan has started." };
}

// C5's I gave it back to Sam, with the day. The page then reads "Waiting for Sam to confirm".
export async function giveBack(
  loanId: string,
  returnedOn: string,
  ownerName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IGiveBackController")({ loanId, returnedOn }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("giveBack"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return { message: `${ownerName} is asked to confirm it’s back.` };
}

// What Is it back? answers with: its message, and the next request in the copy's line, which the
// owner is asked to answer.
export type ConfirmReturnState =
  | { message: string; nextInLine: string | null; error?: undefined }
  | { error: string; message?: undefined; nextInLine?: undefined };

// C8's Yes, it's back, with the day and anything new missing or damaged, or I don't have it yet.
export async function confirmReturn(
  loanId: string,
  answer:
    | { answer: "back"; returnedOn: string; note: string }
    | { answer: "not-yet" },
  words: { title: string; borrower: string },
): Promise<ConfirmReturnState> {
  try {
    const userId = await getCurrentUserId();
    const { nextInLine } = await getInjection("IConfirmReturnController")(
      { loanId, ...answer },
      userId,
    );
    revalidateEverything();
    return answer.answer === "back"
      ? { message: `${words.title} is back.`, nextInLine }
      : {
          message: `${words.borrower} is told it isn’t back yet.`,
          nextInLine: null,
        };
  } catch (err) {
    const state = toActionError(
      err,
      actionLogger("confirmReturn"),
      "That didn’t send. Try again.",
    );
    return { error: state?.error ?? "That didn’t send. Try again." };
  }
}

// C6's Ask Sam: the date asked for, with a note. The page then reads "You asked for 1 more week".
export async function askMoreTime(
  loanId: string,
  request: { dueOn: string; note: string },
  ownerName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IAskMoreTimeController")(
      { loanId, ...request },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("askMoreTime"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return { message: `${ownerName} is asked for more time.` };
}

// C13's Send answer: yes until the date asked or one of the owner's own, or no, with a note.
export async function answerMoreTime(
  loanId: string,
  answer: { note: string } & (
    | { answer: "yes" }
    | { answer: "yes"; dueOn: string }
    | { answer: "no" }
  ),
  borrowerName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IAnswerMoreTimeController")(
      { loanId, ...answer },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("answerMoreTime"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return { message: `${borrowerName} is told.` };
}

// C14's Change the due date.
export async function changeDueDate(
  loanId: string,
  dueOn: string,
  borrowerName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IChangeDueDateController")({ loanId, dueOn }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("changeDueDate"),
      "That didn’t save. Try again.",
    );
  }
  revalidateEverything();
  return { message: `${borrowerName} is told the new date.` };
}

// C15's Call it back, after "Call Gull & Anchor back?". C18's message then offers Text Jo too.
export async function callBack(
  loanId: string,
  borrowerName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("ICallBackController")({ loanId }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("callBack"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return { message: `${borrowerName} is asked to bring it back.` };
}

// C11's I gave it to Jo. The loan's page then reads "Waiting for Jo to confirm".
export async function passAlong(
  loanId: string,
  nextName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IPassAlongController")({ loanId }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("passAlong"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return { message: `${nextName} is asked to confirm.` };
}

// The next friend's I have it, with the day. Their loan's page then reads as C5.
export async function confirmPassAlong(
  loanId: string,
  pickedUpOn: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IConfirmPassAlongController")(
      { loanId, pickedUpOn },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("confirmPassAlong"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return { message: "The loan has started." };
}

// The giver's I still have it, while the next friend hasn't confirmed.
export async function takeBackPassAlong(
  loanId: string,
  nextName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("ITakeBackPassAlongController")({ loanId }, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("takeBackPassAlong"),
      "That didn’t send. Try again.",
    );
  }
  revalidateEverything();
  return { message: `You still have it. ${nextName} is told.` };
}

// What C9 records.
export type RecordLoanInput = {
  userGameId: string;
  borrowerUserId: string;
  pickedUpOn: string;
} & ({ periodDays: number } | { dueOn: string });

// C9's Record the loan. Loans then lists it under You lent.
export async function recordLoan(
  input: RecordLoanInput,
  borrowerName: string,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IRecordLoanController")(input, userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("recordLoan"),
      "That didn’t save. Try again.",
    );
  }
  revalidateEverything();
  return { message: `Loan recorded. ${borrowerName} is told.` };
}
