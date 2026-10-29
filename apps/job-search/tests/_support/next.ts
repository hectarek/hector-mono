// Stand-ins for the Next.js pieces that pages and actions use, installed for every test by
// preload.ts.

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

// What actions and screens asked Next to do: the paths revalidatePath() was given, where a
// screen's router was told to go, and how many times it was told to refresh. Tests reset them.
export const nextState = {
  revalidated: [] as string[],
  pushed: [] as string[],
  refreshed: 0,
};
