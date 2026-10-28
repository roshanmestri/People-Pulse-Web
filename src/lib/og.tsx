import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { readUpload } from "@/lib/storage";

/**
 * Shared pieces for link-preview images (opengraph-image.tsx files). Those render JSX to a
 * PNG with `ImageResponse`, which supports only a subset of CSS (flexbox, no grid) and
 * only TTF/OTF fonts, so Plus Jakarta Sans is kept as .ttf files in src/assets/fonts.
 */
export const OG_SIZE = { width: 1200, height: 630 };

export async function ogFonts() {
  const dir = path.join(process.cwd(), "src", "assets", "fonts");
  const [semibold, extrabold] = await Promise.all([
    readFile(path.join(dir, "PlusJakartaSans-600.ttf")),
    readFile(path.join(dir, "PlusJakartaSans-800.ttf")),
  ]);
  return [
    { name: "Jakarta", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Jakarta", data: extrabold, weight: 800 as const, style: "normal" as const },
  ];
}

/**
 * A photo as a JPEG data URL, cropped to the preview size. ImageResponse can't decode
 * WebP (our uploads), so sharp converts it. Accepts "/images/…" (public folder),
 * "/uploads/…" (local dev uploads) or an absolute URL (Vercel Blob). Null if unreadable.
 */
export async function ogPhoto(src: string): Promise<string | null> {
  try {
    let input: Buffer | null;
    if (src.startsWith("/images/")) input = await readFile(path.join(process.cwd(), "public", src));
    else if (src.startsWith("/uploads/")) input = await readUpload(src.split("/").slice(2));
    else {
      const res = await fetch(src);
      input = res.ok ? Buffer.from(await res.arrayBuffer()) : null;
    }
    if (!input) return null;
    const jpeg = await sharp(input)
      .resize(OG_SIZE.width, OG_SIZE.height, { fit: "cover", position: "attention" })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * ImageResponse only outputs PNG, which is ~800 KB for a photo; WhatsApp skips previews much
 * over ~300 KB. Re-encoding as JPEG gets it to ~100 KB. (Pair with `contentType = "image/jpeg"`.)
 */
export async function asJpeg(image: Response): Promise<Response> {
  const jpeg = await sharp(Buffer.from(await image.arrayBuffer()))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

/** The orange map-pin square + "gathr" wordmark, as in <Logo>. */
export function OgLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 60,
          height: 60,
          borderRadius: 18,
          background: "#FF5B22",
        }}
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0f0f10"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <circle cx="12" cy="10" r="3" />
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
        </svg>
      </div>
      <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.04em", color: "white" }}>
        gathr
      </div>
    </div>
  );
}
