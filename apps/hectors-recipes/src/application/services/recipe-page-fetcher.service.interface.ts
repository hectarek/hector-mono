// Fetches the web page someone linked, for the recipe on it (ux-plan P10.3). Only public web
// addresses, and only HTML pages. Throws PageFetchError, whose reason says what they can do.
export interface IRecipePageFetcherService {
  // The page's HTML, and its address after any redirects.
  fetchPage(url: string): Promise<{ html: string; url: string }>;
}
