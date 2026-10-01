import { ImageResponse } from "next/og";

// The design system's app icon: a mint leaf on a herb-green tile. Square and full-bleed
// (iOS and Android cut their own shape); the leaf stays inside the middle 80% circle, so
// Android's maskable crop never clips it. One drawing for every generated size.
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#137738"/><g transform="translate(530 494) rotate(-45)"><path d="M-280 0A357.87 357.87 0 0 1 280 0A357.87 357.87 0 0 1 -280 0Z" fill="#e3f6e6"/><line x1="-279.5" y1="0" x2="-366" y2="0" stroke="#e3f6e6" stroke-width="37.8" stroke-linecap="round"/><line x1="-224" y1="0" x2="145.6" y2="0" stroke="#137738" stroke-width="24.3" stroke-linecap="round"/></g></svg>`;
const ICON_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(ICON_SVG)}`;

export function renderAppIcon(size: number): ImageResponse {
  return new ImageResponse(
    <img src={ICON_SRC} width={size} height={size} alt="" />,
    { width: size, height: size },
  );
}
