import "server-only";

import type { ProfileInput } from "./schemas";
import { AGE_RANGES, LANGUAGES } from "./schemas";
import type { getMyProfile } from "./queries";

type Profile = NonNullable<Awaited<ReturnType<typeof getMyProfile>>>;

/** Turn the DB row into the form's default values. */
export function toFormDefaults(profile: Profile): ProfileInput {
  const fallbackUsername = profile.email
    .split("@")[0]!
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
  return {
    name: profile.name,
    username: profile.username ?? fallbackUsername,
    bio: profile.bio ?? "",
    ageRange: (AGE_RANGES as readonly string[]).includes(profile.ageRange ?? "")
      ? (profile.ageRange as ProfileInput["ageRange"])
      : null,
    languages: profile.languages.filter((l): l is ProfileInput["languages"][number] =>
      (LANGUAGES as readonly string[]).includes(l),
    ),
    interestIds: profile.interests.map((i) => i.categoryId),
    home:
      profile.homeAreaName && profile.homeLatitude != null && profile.homeLongitude != null
        ? {
            areaName: profile.homeAreaName,
            latitude: profile.homeLatitude,
            longitude: profile.homeLongitude,
          }
        : null,
  };
}
