import type { MetadataRoute } from "next";

// Lets "Add to Home Screen" open Energie like an app, with its own icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Energie",
    short_name: "Energie",
    description: "บันทึกค่าไฟในบ้านและพยากรณ์ค่าไฟรายเดือน",
    lang: "th",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#f8fafc",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
