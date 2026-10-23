import { ensureReminders, unreadCount } from "@/features/notifications/queries";
import { getSessionUser } from "@/lib/session";

// Polled by the header bell. Also the moment we lazily create "starts soon" reminders.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ count: 0 }, { status: 401 });
  await ensureReminders(user.id);
  return Response.json(
    { count: await unreadCount(user.id) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
