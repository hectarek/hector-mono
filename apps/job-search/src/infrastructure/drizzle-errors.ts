import { DrizzleQueryError } from "drizzle-orm/errors";

// Drizzle wraps every failed query in a DrizzleQueryError, which doesn't name itself, and the
// production build renames classes, so loggable (docs/build-plan.md KTD20) logged every failed
// query under a short made-up class name. Named on its prototype, each instance carries the
// name, as the app's own errors do (src/entities/errors/common.ts). The repositories and the
// transaction manager, which log drizzle's errors, import this.
DrizzleQueryError.prototype.name = "DrizzleQueryError";
