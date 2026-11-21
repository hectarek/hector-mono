import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

// What a signed-in account gets (KTD3): a removed account sees only that it was removed, one with
// no profile goes to set it up (A4), and everyone else gets the app, with the piece the header
// shows.
export type AccountState =
  | { state: "removed" }
  | { state: "needs-profile" }
  | { state: "ready"; me: NameAndPiece };
