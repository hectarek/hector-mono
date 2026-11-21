import { connection } from "next/server";
import { gate } from "@/app/_lib/account";

// The gate after sign-in for every page of the app (KTD3): an account with no profile goes to set
// it up (A4), a removed one to the page that says so, and signed out to the welcome page. It draws
// nothing, and waits on connection() as every page that reads the session does.
export async function AccountGate() {
  await connection();
  await gate("app");
  return null;
}
