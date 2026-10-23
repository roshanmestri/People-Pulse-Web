import { getChatAccess, listMessages } from "@/features/chat/queries";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// Polled by the chat page every few seconds (TanStack Query). Members only.
// Polling also means "I'm looking at this chat", so its new-message alert is cleared.
export async function GET(_request: Request, ctx: RouteContext<"/api/activities/[id]/messages">) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!(await getChatAccess(id, user.id)))
    return Response.json({ error: "Not a member" }, { status: 403 });
  await db.notification.updateMany({
    where: {
      userId: user.id,
      type: "NEW_MESSAGE",
      readAt: null,
      payload: { path: ["activityId"], equals: id },
    },
    data: { readAt: new Date() },
  });
  return Response.json(
    { messages: await listMessages(id) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
