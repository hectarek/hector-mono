// The library's address for a book, search and tag, as the search box and tag chips write it.
export function libraryHref({
  book,
  search,
  tag,
}: {
  book?: string;
  search?: string;
  tag?: string;
}): string {
  const params = new URLSearchParams();
  if (book) params.set("book", book);
  if (search) params.set("q", search);
  if (tag) params.set("tag", tag);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
