// Gathr runs in India: forms speak IST, the database stores UTC.
const IST_OFFSET_MINUTES = 330;
const MINUTE = 60_000;

/** "2026-10-26" + "19:00" (IST wall clock) → the matching UTC Date. */
export function istToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, hh!, mm! - IST_OFFSET_MINUTES));
}

/** UTC Date → { date: "2026-10-26", time: "19:00" } in IST, for pre-filling forms. */
export function utcToIstParts(value: Date): { date: string; time: string } {
  const ist = new Date(value.getTime() + IST_OFFSET_MINUTES * MINUTE).toISOString();
  return { date: ist.slice(0, 10), time: ist.slice(11, 16) };
}

/** Tomorrow's date in IST ("2026-10-24"), used as the host form's default. */
export function tomorrowInIst(now: Date = new Date()) {
  return utcToIstParts(new Date(now.getTime() + 24 * 60 * MINUTE)).date;
}

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...options });

export const formatDay = fmt({ weekday: "short", day: "numeric", month: "short" }).format;
export const formatLongDay = fmt({ weekday: "long", day: "numeric", month: "long" }).format;
export const formatTime = fmt({ hour: "numeric", minute: "2-digit" }).format;

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h} h`;
}
