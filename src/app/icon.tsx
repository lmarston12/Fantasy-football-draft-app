import { ImageResponse } from "next/og";

/**
 * App icon: a football-brown badge with an "FF" monogram and a lace stitch,
 * rendered at request time (statically cached by Next.js). Also see
 * `apple-icon.tsx` for the iOS home-screen variant and `favicon.ico` for the
 * legacy `/favicon.ico` request every browser makes regardless of the
 * generated `<link rel="icon">` tag.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#ffffff",
            fontFamily: "Arial, sans-serif",
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          FF
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 2,
            width: 11,
            height: 2,
            background: "#ffffff",
            borderRadius: 2,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
