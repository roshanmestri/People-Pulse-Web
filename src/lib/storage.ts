import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where uploaded files live. M3 uses the local disk (fine for development); at deploy
 * (M9) we swap in a cloud store (Cloudinary / UploadThing / Vercel Blob) behind the
 * same three functions, because hosts like Vercel have no permanent disk.
 */
const ROOT = path.join(process.cwd(), ".data", "uploads");
const FOLDERS = ["covers", "avatars"] as const;
export type UploadFolder = (typeof FOLDERS)[number];

/** Saves a WebP image and returns its public URL, e.g. "/uploads/covers/<id>.webp". */
export async function saveImage(folder: UploadFolder, data: Buffer): Promise<string> {
  const name = `${randomUUID()}.webp`;
  await mkdir(path.join(ROOT, folder), { recursive: true });
  await writeFile(path.join(ROOT, folder, name), data);
  return `/uploads/${folder}/${name}`;
}

/** Best-effort delete of a file we stored earlier (ignores URLs we don't own). */
export async function deleteImage(url: string | null | undefined) {
  const file = resolveUpload(url?.replace(/^\/uploads\//, "").split("/") ?? []);
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
