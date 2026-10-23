import { readUpload } from "@/lib/storage";

// Serves files saved by src/lib/storage.ts. File names are random UUIDs and never
// change, so browsers and next/image may cache them forever.
export async function GET(_request: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const { path } = await ctx.params;
  const data = await readUpload(path);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
