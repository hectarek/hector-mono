import type { JobStatus } from "../job-lifecycle";
import type { ChangeActor } from "./activity.model";

// One status move (KTD7): from where, to where, the date it happened, which can be earlier than
// when it was logged, and who made it. The counts and lead-source yield read these dates.
export type JobStatusChange = {
  from: JobStatus;
  to: JobStatus;
  on: string;
  actor: ChangeActor;
};

// A move as it's read back: with the order it was logged in.
export type LoggedStatusChange = JobStatusChange & { id: number };
