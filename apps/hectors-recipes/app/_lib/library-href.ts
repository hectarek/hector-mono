// The library's address for a book, search, tag, the Saved filter, and its order or grouping,
// as the search box, the Sort and group picker and the chips write it (D57, D80).
export function libraryHref({
  book,
  search,
  tag,
  saved,
  sort,
  group,
}: {
  book?: string;
  search?: string;
  tag?: string;
  saved?: boolean;
  sort?: string;
  group?: string;
}): string {
  const params = new URLSearchParams();
  if (book) params.set("book", book);
  if (search) params.set("q", search);
  if (tag) params.set("tag", tag);
  if (saved) params.set("saved", "1");
  if (sort) params.set("sort", sort);
  if (group) params.set("group", group);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
