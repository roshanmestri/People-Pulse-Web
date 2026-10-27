import { checkImageFile, MAX_IMAGE_BYTES, MAX_ORIGINAL_BYTES } from "./image-rules";

// Covers are stored 1600 px wide and avatars 512 px, so 2400 px leaves room for cropping.
const MAX_SIDE = 2400;

/**
 * Browser only. Checks a picked photo and, if it's big, redraws it smaller on a <canvas>
 * before upload. Phone photos are often 5–12 MB, over Vercel's 4.5 MB request limit, and
 * uploading the full file on mobile data is slow anyway. The server still re-checks it.
 */
export async function prepareImage(file: File): Promise<{ file: File } | { error: string }> {
  const problem = checkImageFile(file, MAX_ORIGINAL_BYTES);
  if (problem) return { error: problem };
  if (file.size <= MAX_IMAGE_BYTES / 2) return { file }; // small enough already
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; // JPEG has no transparency; avoid black behind transparent PNGs
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return { error: "That file doesn't look like a valid image." };
    const shrunk = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
    return checkImageFile(shrunk)
      ? { error: "That photo is too large — pick a smaller one." }
      : { file: shrunk };
  } catch {
    return { error: "That file doesn't look like a valid image." };
  }
}
