// Verified-host badge rules (BRD FR-2.5). Pure functions so they're easy to unit-test.

export type VerificationFacts = {
  emailVerified: boolean;
  name: string;
  image: string | null;
  bio: string | null;
  homeAreaName: string | null;
  interestCount: number;
  verificationRevokedAt: Date | null;
};

export type ChecklistItem = { label: string; done: boolean };

export function verificationChecklist(f: VerificationFacts): ChecklistItem[] {
  return [
    { label: "Verify your email", done: f.emailVerified },
    { label: "Add your name", done: f.name.trim().length >= 2 },
    { label: "Add a profile photo", done: Boolean(f.image) },
    { label: "Write a short bio", done: Boolean(f.bio?.trim()) },
    { label: "Set your home area", done: Boolean(f.homeAreaName) },
    { label: "Pick at least one interest", done: f.interestCount > 0 },
  ];
}

export function isEligibleForBadge(f: VerificationFacts) {
  return !f.verificationRevokedAt && verificationChecklist(f).every((item) => item.done);
}

/** Keep the original verifiedAt while still eligible; clear it when no longer eligible. */
export function nextVerifiedAt(f: VerificationFacts, current: Date | null, now = new Date()) {
  if (!isEligibleForBadge(f)) return null;
  return current ?? now;
}
