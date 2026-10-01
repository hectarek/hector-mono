import { authViewPaths } from "@neondatabase/auth/react/ui/server";

// Auth pages bounce someone already signed in back into the app, except sign-out:
// it can only end a session that exists.
export function skipsWhenSignedIn(path: string): boolean {
  return path !== authViewPaths.SIGN_OUT;
}
