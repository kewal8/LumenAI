import type { MetadataRoute } from "next";

/**
 * Lets LumenAI be added to a phone's home screen and open like an app: its own
 * icon, full screen, no browser bar. It opens on the New report screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LumenAI",
    short_name: "LumenAI",
    description: "Dictate the abnormal findings. LumenAI writes the radiology report.",
    id: "/report",
    start_url: "/report",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f5f5",
    theme_color: "#fefefe",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
