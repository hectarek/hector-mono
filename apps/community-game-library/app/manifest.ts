import type { MetadataRoute } from "next";

// What a phone puts on its home screen (R43, Y2): the name, the short name under the icon, Three
// pieces (public/icons, made from the design system's icon.svg), and kraft for the splash and the
// browser bar. It opens full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Community Game Library",
    short_name: "Game Library",
    description: "Your friends’ board games, in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#d9bc8c",
    theme_color: "#d9bc8c",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
