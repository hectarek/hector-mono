"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { pageNameFor } from "@/src/content/pages";
import { SITE_NAME } from "@/src/site";

// The only <title> on every page, rendered from the shell rather than from each page's metadata:
// Next keeps visited pages mounted, and with metadata titles its route announcer could speak the
// page just left (docs/solutions/ui-bugs/route-announcer-speaks-the-page-left-behind-with-metadata-titles.md).
// Reading the path sits under <Suspense>, which the [topic] route needs to prerender
// (docs/solutions/build-errors/layout-client-component-reading-the-path-fails-next-build.md).
export function PageTitle() {
  return (
    <Suspense>
      <PageTitleTag />
    </Suspense>
  );
}

function PageTitleTag() {
  const name = pageNameFor(usePathname());
  return <title>{name ? `${name} · ${SITE_NAME}` : SITE_NAME}</title>;
}
