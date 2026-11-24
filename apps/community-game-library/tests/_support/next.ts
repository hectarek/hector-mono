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
const USER_ID = "00000000-0000-4000-8000-0000000000f1";

export const nextState = {
  userId: USER_ID as string | undefined,
  // The picture the sign-in came with (a Google account's); an email account has none.
  userImage: null as string | null,
  revalidated: [] as string[],
  // Where a screen's router.push() went (screen tests).
  pushed: [] as string[],
  // The router's bfcacheId: a new value is a fresh arrival at the page (a link, a redirect).
  visit: "visit-1",
};

function resetNextState(): void {
  nextState.userId = USER_ID;
  nextState.userImage = null;
  nextState.revalidated = [];
  nextState.pushed = [];
  nextState.visit = "visit-1";
}

// Signs in as a brand-new user. The DI container's mock repositories live for the whole
// run, so a fresh user per test is what keeps tests from seeing each other's data.
export function signInAsNewUser(): string {
  resetNextState();
  const userId = crypto.randomUUID();
  nextState.userId = userId;
  return userId;
}
