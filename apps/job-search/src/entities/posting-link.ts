import { byCodePoint } from "./code-point-order";

// A posting's key (docs/build-plan.md KTD8): what two links to one posting share, so a posting
// already on a job is refused as a duplicate, whatever tracking a link carries. The scheme, a
// leading "www.", the fragment, utm_ parameters, a trailing slash and the query's order never
// count. LinkedIn and Indeed key on their job ids; Greenhouse's gh_src goes, and a Workday or
// Lever link loses its whole query. Give it a link that's already been read as an http(s) URL.
export function postingKey(link: string): string {
  const url = new URL(link);
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "");

  if (onHost(host, "linkedin.com")) {
    const id =
      path.match(/^\/jobs\/view\/(?:.*-)?(\d+)$/)?.[1] ??
      url.searchParams.get("currentJobId");
    if (id && /^\d+$/.test(id)) {
      return `linkedin.com/jobs/view/${id}`;
    }
  }
  if (onHost(host, "indeed.com")) {
    const id = url.searchParams.get("jk") ?? url.searchParams.get("vjk");
    if (id) {
      return `${host}/viewjob?jk=${id}`;
    }
  }

  const query = QUERY_DROPPED.some((board) => onHost(host, board))
    ? []
    : [...url.searchParams]
        .filter(([name]) => !name.startsWith("utm_") && name !== "gh_src")
        .sort(
          ([a, aValue], [b, bValue]) =>
            byCodePoint(a, b) || byCodePoint(aValue, bValue),
        );
  return query.length
    ? `${host}${path}?${new URLSearchParams(query)}`
    : `${host}${path}`;
}

// Job boards whose query only ever tracks where a visit came from.
const QUERY_DROPPED = [
  "myworkdayjobs.com",
  "myworkdaysite.com",
  "lever.co",
] as const;

function onHost(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}
