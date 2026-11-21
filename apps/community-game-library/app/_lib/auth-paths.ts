import {
  accountViewPaths,
  authViewPaths,
} from "@neondatabase/auth/react/ui/server";

// The paths Neon's views draw. Every other /auth or /account path is a 404.
export const AUTH_PATHS: readonly string[] = Object.values(authViewPaths);
export const ACCOUNT_PATHS: readonly string[] = Object.values(accountViewPaths);

// Where the account pages start, and the page that signs out. Plain links, so the sign-in kit
// loads only on those pages (docs/build-plan.md KTD2).
export const ACCOUNT_HREF = `/account/${accountViewPaths.SETTINGS}`;
export const SIGN_OUT_HREF = `/auth/${authViewPaths.SIGN_OUT}`;

// Auth pages bounce someone already signed in back into the app, except sign-out:
// it can only end a session that exists.
export function skipsWhenSignedIn(path: string): boolean {
  return path !== authViewPaths.SIGN_OUT;
}
