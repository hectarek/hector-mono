"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  type ActionState,
  actionLogger,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";

// E9's Delete my account, after "Delete your account?": the account's rows, photo and sign-in go,
// and this device is signed out. A member leaving changes their friends' libraries, nights and
// loans, so the whole app revalidates. The page then opens /welcome.
export async function deleteAccount(): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IDeleteAccountController")(userId);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("deleteAccount"),
      "That didn’t save. Try again.",
    );
  }
  await getInjection("IAuthenticationService").signOut();
  revalidatePath("/", "layout");
  return { message: "Your account is deleted" };
}
