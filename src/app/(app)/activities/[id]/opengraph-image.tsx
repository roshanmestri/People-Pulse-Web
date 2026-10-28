import { ImageResponse } from "next/og";

import { getActivity } from "@/features/activity/queries";
import { categoryPhoto } from "@/lib/category-media";
import { asJpeg, OG_SIZE, OgLogo, ogFonts, ogPhoto } from "@/lib/og";
import { formatDay, formatTime } from "@/lib/time";

// The card WhatsApp shows when a plan link is shared: its photo, title, time and AREA.
// Never the venue name or coordinates (the link is public).
export const alt = "A plan on Gathr";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await getActivity(id);
  const visible = activity && activity.status !== "DRAFT" && !activity.hiddenAt;

  const photo = await ogPhoto(
    (visible && (activity.coverImage ?? categoryPhoto(activity.category.slug))) ||
      "/images/hero-football.jpg",
  );
  const when = visible
    ? `${formatDay(activity.startsAt)} · ${formatTime(activity.startsAt)} · ${activity.areaName}`
    : null;

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
            backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.9))",
          }}
        >
          <OgLogo />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {visible ? (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  padding: "8px 20px",
                  borderRadius: 999,
                  background: "#FF5B22",
                  color: "white",
                  fontSize: 28,
                  fontWeight: 800,
                }}
              >
                {activity.category.name}
              </div>
            ) : null}
            <div
              style={{
                fontSize: 76,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.05em",
                color: "white",
                // Long titles: cap at two lines.
                display: "block",
                lineClamp: 2,
              }}
            >
              {visible ? activity.title : "Find your people. Play tonight."}
            </div>
            {when ? (
              <div style={{ fontSize: 34, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                {when}
              </div>
            ) : null}
          </div>
        </div>
      </div>,
      { ...size, fonts: await ogFonts() },
    ),
  );
}
