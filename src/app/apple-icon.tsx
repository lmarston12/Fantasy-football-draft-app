import { ImageResponse } from "next/og";

/** iOS home-screen icon — same FF mark as `icon.tsx`, at Apple's 180x180. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #8a4a26 0%, #5e3016 100%)",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            fontSize: 100,
            fontWeight: 800,
            color: "#ffffff",
            fontFamily: "Arial, sans-serif",
            letterSpacing: -6,
            lineHeight: 1,
          }}
        >
          FF
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 10,
            width: 61,
            height: 11,
            background: "#ffffff",
            borderRadius: 4,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
