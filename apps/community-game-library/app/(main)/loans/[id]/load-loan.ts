import { notFound } from "next/navigation";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";

// Everything a loan's pages read, through its controller: a loan the member isn't part of, or an
// id that isn't one, is Not found.
export async function loadLoan(loanId: string, userId: string) {
  try {
    return await getInjection("IGetLoanController")({ loanId }, userId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    throw err;
  }
}
