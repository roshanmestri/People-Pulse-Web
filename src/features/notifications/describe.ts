// Turn a stored notification (type + JSON payload) into a sentence and a link.
// Pure → unit-tested. Payloads are written by the join/activity/chat actions.

export type NotificationKind =
  | "JOIN_REQUEST"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "ACTIVITY_UPDATED"
  | "ACTIVITY_CANCELLED"
  | "NEW_MESSAGE"
  | "REMINDER";

type Payload = {
  activityId?: string;
  title?: string;
  actorName?: string;
  joined?: boolean;
  removed?: boolean;
  preview?: string;
  count?: number;
};

export type Described = { text: string; href: string | null };

function asPayload(value: unknown): Payload {
  return value && typeof value === "object" ? (value as Payload) : {};
}

const firstName = (name?: string) => name?.split(" ")[0] || "Someone";

export function describeNotification(type: NotificationKind, raw: unknown): Described {
  const p = asPayload(raw);
  const title = p.title ? `“${p.title}”` : "a plan";
  const plan = p.activityId ? `/activities/${p.activityId}` : null;
  switch (type) {
    case "JOIN_REQUEST":
      return p.joined
        ? { text: `${firstName(p.actorName)} joined ${title}`, href: plan && `${plan}/manage` }
        : {
            text: `${firstName(p.actorName)} asked to join ${title}`,
            href: plan && `${plan}/manage`,
          };
    case "REQUEST_APPROVED":
      return { text: `You're in! ${firstName(p.actorName)} approved you for ${title}`, href: plan };
    case "REQUEST_REJECTED":
      return p.removed
        ? { text: `You were removed from ${title}`, href: plan }
        : { text: `Your request for ${title} wasn't accepted this time`, href: plan };
    case "ACTIVITY_UPDATED":
      return { text: `${title} changed its time or place — check the details`, href: plan };
    case "ACTIVITY_CANCELLED":
      return { text: `${title} was cancelled by the host`, href: plan };
    case "NEW_MESSAGE": {
      const more = p.count && p.count > 1 ? ` (+${p.count - 1} more)` : "";
      const preview = p.preview ? `: ${p.preview}` : "";
      return {
        text: `${firstName(p.actorName)} in ${title}${preview}${more}`,
        href: plan && `${plan}/chat`,
      };
    }
    case "REMINDER":
      return { text: `${title} starts in less than 2 hours`, href: plan };
  }
}
