// The library's address for a book, search, tag and grouping, as the search box, the Group
// by picker and the tag chips write it.
export function libraryHref({
  book,
  search,
  tag,
  group,
}: {
  book?: string;
  search?: string;
  tag?: string;
  group?: string;
}): string {
  const params = new URLSearchParams();
  if (book) params.set("book", book);
  if (search) params.set("q", search);
  if (tag) params.set("tag", tag);
  if (group) params.set("group", group);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
