import type { IRecipePageFetcherService } from "@/src/application/services/recipe-page-fetcher.service.interface";
import {
  PageFetchError,
  type PageFetchFailure,
} from "@/src/entities/errors/common";

// Serves `pages` by address, records what it was asked for, or fails with `failWith`.
export class MockRecipePageFetcherService implements IRecipePageFetcherService {
  readonly pages = new Map<string, string>();
  readonly fetched: string[] = [];
  failWith: PageFetchFailure | null = null;

  async fetchPage(url: string): Promise<{ html: string; url: string }> {
    this.fetched.push(url);
    if (this.failWith) {
      throw new PageFetchError(this.failWith);
    }
    const html = this.pages.get(url);
    if (html === undefined) {
      throw new PageFetchError("not-found");
    }
    return { html, url };
  }
}
