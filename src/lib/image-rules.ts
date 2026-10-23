// Upload limits shared by the browser (instant feedback) and the server (src/lib/images.ts).
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Returns an error message, or null when the file is fine to upload. */
export function checkImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Use a JPG, PNG or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) return "That photo is over 5 MB — pick a smaller one.";
  return null;
}
