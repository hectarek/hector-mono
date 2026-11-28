import { SITE_NAME } from "@/src/site";

// The only <title> on every page, rendered from the shell rather than from each page's metadata:
// Next keeps visited pages mounted, and with metadata titles its route announcer could speak the
// page just left (docs/solutions/ui-bugs/route-announcer-speaks-the-page-left-behind-with-metadata-titles.md).
export function PageTitle() {
  return <title>{SITE_NAME}</title>;
}
