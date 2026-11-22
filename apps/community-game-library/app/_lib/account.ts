import { redirect } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/app/_lib/current-user";
import { getInjection } from "@/di/container";
import type { AccountState } from "@/src/entities/account-state";
import type { User } from "@/src/entities/models/user.model";

export type Account = { user: User } & AccountState;

// The signed-in account and what it's allowed (KTD3), read once a request however many places
// ask (the shell's gate, the header's piece, the page). Undefined when signed out.
export const getAccount = cache(async (): Promise<Account | undefined> => {
  const user = await getCurrentUser();
  if (!user) {
    return undefined;
  }
  return {
    user,
    ...(await getInjection("IGetAccountStateController")(user.id)),
  };
});

// Where an account belongs after it signs in: with no profile, setting it up (A4); removed, on
// the page that says so; everyone else in the app.
export type Landing = "app" | "start" | "removed";

const LANDINGS: Record<Landing, string> = {
  app: "/",
  start: "/start/profile",
  removed: "/removed",
};

function landingOf(account: Account): Landing {
  if (account.state === "removed") return "removed";
  return account.state === "needs-profile" ? "start" : "app";
}

// The one gate after sign-in, which the signed-in shell and the setup and removed pages all use:
// a page for one landing sends an account that belongs on another there. Signed out goes to the
// welcome page. A page can't call it before its own connection() wait (AGENTS.md, Cache
// Components).
export async function gate(
  landing: "app",
): Promise<Account & { state: "ready" }>;
export async function gate(
  landing: "start",
): Promise<Account & { state: "needs-profile" }>;
export async function gate(
  landing: "removed",
): Promise<Account & { state: "removed" }>;
export async function gate(landing: Landing): Promise<Account> {
  const account = await getAccount();
  if (!account) {
    redirect("/welcome");
  }
  if (landingOf(account) !== landing) {
    redirect(LANDINGS[landingOf(account)]);
  }
  return account;
}
