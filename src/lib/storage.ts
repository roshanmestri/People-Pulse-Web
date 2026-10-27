import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, put } from "@vercel/blob";

/**
 * Where uploaded files live, behind three functions so the rest of the app doesn't care:
 * - Production (Vercel): Vercel Blob, a cloud file store. Vercel functions have no
 *   permanent disk, so a file written there would vanish. Turned on by BLOB_STORE_ID (newer
 *   stores: Vercel signs requests for us via OIDC) or BLOB_READ_WRITE_TOKEN (older stores).
 * - Development: the local disk (.data/uploads), served by /uploads/[...path].
 */
const useBlob = Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
const BLOB_HOST = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//;

const ROOT = path.join(process.cwd(), ".data", "uploads");
const FOLDERS = ["covers", "avatars"] as const;
export type UploadFolder = (typeof FOLDERS)[number];

/**
 * Saves a WebP image and returns its public URL: "https://….blob.vercel-storage.com/covers/<id>.webp"
 * in production, "/uploads/covers/<id>.webp" locally.
 */
export async function saveImage(folder: UploadFolder, data: Buffer): Promise<string> {
  const name = `${randomUUID()}.webp`;
  if (useBlob) {
    const blob = await put(`${folder}/${name}`, data, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false, // the name is already a random UUID
      cacheControlMaxAge: 60 * 60 * 24 * 365, // never changes, so cache for a year
    });
    return blob.url;
  }
  await mkdir(path.join(ROOT, folder), { recursive: true });
  await writeFile(path.join(ROOT, folder, name), data);
  return `/uploads/${folder}/${name}`;
}

/** Best-effort delete of a file we stored earlier (ignores URLs we don't own, e.g. Google photos). */
export async function deleteImage(url: string | null | undefined) {
  if (!url) return;
  if (BLOB_HOST.test(url)) {
    if (useBlob) await del(url).catch(() => undefined);
    return;
  }
  const file = resolveUpload(url.replace(/^\/uploads\//, "").split("/"));
  if (file) await unlink(file).catch(() => undefined);
}

export async function readUpload(segments: string[]): Promise<Buffer | null> {
  const file = resolveUpload(segments);
  return file ? readFile(file).catch(() => null) : null;
}

/** Only "<known folder>/<uuid>.webp" — blocks path tricks like "../../.env". */
function resolveUpload(segments: string[]): string | null {
  const [folder, name, ...rest] = segments;
  if (rest.length || !FOLDERS.includes(folder as UploadFolder)) return null;
  if (!name || !/^[0-9a-f-]{36}\.webp$/.test(name)) return null;
  return path.join(ROOT, folder!, name);
}
