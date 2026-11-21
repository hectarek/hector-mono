import { getInjection } from "@/di/container";
import type { User } from "@/src/entities/models/user.model";

// The signed-in account as Neon Auth knows it: its id, the name it was made with, and its email.
export async function getCurrentUser(): Promise<User | undefined> {
  const session = await getInjection("IAuthenticationService").getSession();
  return session?.user;
}

export async function getCurrentUserId(): Promise<string | undefined> {
  return (await getCurrentUser())?.id;
}
