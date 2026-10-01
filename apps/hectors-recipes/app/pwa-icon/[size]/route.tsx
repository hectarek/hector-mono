import { renderAppIcon } from "@/app/_lib/app-icon";

// Fixed URLs for the manifest (the icon.tsx convention adds a hash to its URL).
const SIZES = new Set(["192", "512"]);

export function generateStaticParams() {
  return [...SIZES].map((size) => ({ size }));
}

export const dynamicParams = false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
): Promise<Response> {
  const { size } = await params;
  if (!SIZES.has(size)) {
    return new Response("Not found", { status: 404 });
  }
  return renderAppIcon(Number(size));
}
