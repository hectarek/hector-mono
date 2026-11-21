import { getInjection } from "@/di/container";

export async function getCurrentUserId(): Promise<string | undefined> {
  const session = await getInjection("IAuthenticationService").getSession();
  return session?.user.id;
}
