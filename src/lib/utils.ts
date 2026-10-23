export { cn } from "cn";

/** "Aarav Kulkarni" → "AK" (for avatar fallbacks). */
export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

/** Only allow same-site relative redirects ("/me"), never "//evil.com" or full URLs. */
export function safeNextPath(next: string | undefined, fallback = "/explore") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
