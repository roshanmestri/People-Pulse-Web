// Upload limits shared by the browser (instant feedback) and the server (src/lib/images.ts).

/** What the server accepts. Vercel rejects request bodies over 4.5 MB. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** What you can pick in the browser; bigger photos are shrunk first (src/lib/shrink-image.ts). */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Returns an error message, or null when the file is fine to upload. */
export function checkImageFile(file: File, maxBytes = MAX_IMAGE_BYTES): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Use a JPG, PNG or WebP image.";
  if (file.size > maxBytes)
    return `That photo is over ${maxBytes / 1024 / 1024} MB — pick a smaller one.`;
  return null;
}
