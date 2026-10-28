import { ImageResponse } from "next/og";

import { asJpeg, OG_SIZE, OgLogo, ogFonts, ogPhoto } from "@/lib/og";

// File convention: Next turns this into the site's default <meta property="og:image">,
// the picture WhatsApp/X/Slack show when someone shares a Gathr link. Pages can override
// it with their own opengraph-image file (see activities/[id]). Output is re-encoded as
// JPEG to stay small enough for WhatsApp (see asJpeg).
export const alt = "Gathr — find people nearby for football, treks, jams and more";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default async function Image() {
  const photo = await ogPhoto("/images/hero-football.jpg");
  return asJpeg(
    new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0a0a0c" }}>
        {photo ? (
          <img
            src={photo}
            alt=""
            width={OG_SIZE.width}
            height={OG_SIZE.height}
            style={{ position: "absolute" }}
          />
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: 64,
            fontFamily: "Jakarta",
            backgroundImage: "linear-gradient(90deg, rgba(0,0,0,0.88), rgba(0,0,0,0.35))",
          }}
        >
          <OgLogo />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 92,
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: "-0.055em",
              }}
            >
              <span style={{ color: "white" }}>Find your people.</span>
              <span style={{ color: "#FF5B22" }}>Play tonight.</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>
              Football, treks, badminton, jams — with people nearby.
            </div>
          </div>
        </div>
      </div>,
      { ...size, fonts: await ogFonts() },
    ),
  );
}
