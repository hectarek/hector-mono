import { z } from "zod";
import { LOAN_STATUSES } from "../loan";

// One loan of a copy, from the request to its end (docs/data-model.md, loans). src/entities/loan.ts
// holds its moves, dates and states. Dates are "YYYY-MM-DD" in Eastern time (KTD9).
export const loanSchema = z.object({
  id: z.uuid(),
  userGameId: z.uuid(),
  borrowerUserId: z.uuid(),
  // The loan it followed in a pass-along.
  previousLoanId: z.uuid().nullable(),
  status: z.enum(LOAN_STATUSES),
  requestNote: z.string().nullable(),
  periodDays: z.number().int().nullable(),
  dueOn: z.iso.date().nullable(),
  pickedUpOn: z.iso.date().nullable(),
  returnedOn: z.iso.date().nullable(),
  // A request for more time, while it waits: the date asked for, its note and when.
  moreTimeDueOn: z.iso.date().nullable(),
  moreTimeNote: z.string().nullable(),
  moreTimeAskedAt: z.date().nullable(),
  calledBackAt: z.date().nullable(),
  answeredAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Loan = z.infer<typeof loanSchema>;
