import {
  accountViewPaths,
  authViewPaths,
} from "@neondatabase/auth/react/ui/server";

// The paths Neon's views draw. Every other /auth or /account path is a 404.
export const AUTH_PATHS: readonly string[] = Object.values(authViewPaths);
export const ACCOUNT_PATHS: readonly string[] = Object.values(accountViewPaths);

// Auth pages bounce someone already signed in back into the app, except sign-out:
// it can only end a session that exists.
export function skipsWhenSignedIn(path: string): boolean {
  return path !== authViewPaths.SIGN_OUT;
}
