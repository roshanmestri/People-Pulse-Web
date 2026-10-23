import "server-only";

import sharp from "sharp";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ImageResult = { ok: true; data: Buffer } | { ok: false; error: string };

/**
 * Validate an uploaded image and re-encode it as WebP. Re-encoding also strips EXIF
 * metadata (e.g. the GPS location of where a phone photo was taken).
 */
export async function processImage(
  file: File,
  maxWidth: number,
  { square = false }: { square?: boolean } = {},
): Promise<ImageResult> {
  if (!ACCEPTED.has(file.type)) return { ok: false, error: "Use a JPG, PNG or WebP image." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Images must be under 5 MB." };
  try {
    const data = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate() // respect the phone's orientation flag before metadata is dropped
      .resize(
        square
          ? { width: maxWidth, height: maxWidth, fit: "cover" } // avatars: centred square crop
          : { width: maxWidth, withoutEnlargement: true },
      )
      .webp({ quality: 80 })
      .toBuffer();
    return { ok: true, data };
  } catch {
    return { ok: false, error: "That file doesn't look like a valid image." };
  }
}
