import "server-only";

import sharp from "sharp";

import { checkImageFile } from "./image-rules";

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
  const problem = checkImageFile(file);
  if (problem) return { ok: false, error: problem };
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
