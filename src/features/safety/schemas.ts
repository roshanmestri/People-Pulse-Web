import { z } from "zod";

export const REPORT_TARGETS = ["USER", "ACTIVITY", "MESSAGE"] as const;
export const REPORT_REASONS = [
  ["spam", "Spam or advertising"],
  ["harassment", "Harassment or bullying"],
  ["inappropriate", "Inappropriate or offensive"],
  ["scam", "Fake, scam or misleading"],
  ["unsafe", "Feels unsafe"],
  ["other", "Something else"],
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number][0];

/** Max reports one person can file per day (abuse of the report button is abuse too). */
export const REPORTS_PER_DAY = 10;

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().min(1).max(40),
  reason: z.enum(REPORT_REASONS.map(([value]) => value) as [ReportReason, ...ReportReason[]]),
  details: z.string().trim().max(500, "Keep it under 500 characters"),
});

export type ReportInput = z.infer<typeof reportSchema>;
