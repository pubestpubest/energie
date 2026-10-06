import { ImageResponse } from "next/og";

// iOS home-screen icon. Full-bleed: iOS applies its own rounded mask.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#059669" }}>
        <svg width="104" height="104" viewBox="0 0 24 24">
          <path
            fill="#fff"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinejoin="round"
            d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"
          />
        </svg>
      </div>
    ),
    size,
  );
}
