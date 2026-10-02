// Stand-ins for the Next.js and session pieces server actions and page helpers use,
// installed for every test by preload.ts. Tests read and set this state directly.

// What Next's redirect() and notFound() throw, so a test can assert where it went.
export class Redirected extends Error {
  constructor(readonly url: string) {
    super(`Redirected to ${url}`);
  }
}
export class NotFoundPage extends Error {
  constructor() {
    super("notFound()");
  }
}

// Actions and pages read the user through getCurrentUserId; undefined means signed out.
export const USER_ID = "00000000-0000-4000-8000-0000000000f1";

export const nextState = {
  userId: USER_ID as string | undefined,
  revalidated: [] as string[],
  // Where a screen's router.push() went (screen tests).
  pushed: [] as string[],
};

export function resetNextState(): void {
  nextState.userId = USER_ID;
  nextState.revalidated = [];
  nextState.pushed = [];
}

// Signs in as a brand-new user. The DI container's mock repositories live for the whole
// run, so a fresh user per test is what keeps tests from seeing each other's data.
export function signInAsNewUser(): string {
  resetNextState();
  const userId = crypto.randomUUID();
  nextState.userId = userId;
  return userId;
}
