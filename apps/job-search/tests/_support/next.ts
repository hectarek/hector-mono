// Stand-ins for the Next.js pieces that pages and actions use, installed for every test by
// preload.ts.

// What Next's redirect() throws, so a test can assert where it went.
export class Redirected extends Error {
  constructor(readonly url: string) {
    super(`Redirected to ${url}`);
  }
}

// What actions asked Next to do: the paths revalidatePath() was given. Tests reset it.
export const nextState = {
  revalidated: [] as string[],
};
