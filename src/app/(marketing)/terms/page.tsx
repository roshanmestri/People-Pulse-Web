import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Terms",
  description: "The ground rules for using Gathr and meeting people through it.",
};

const UPDATED = "28 October 2026";

const SECTIONS = [
  {
    title: "Using Gathr",
    items: [
      "You must be 18 or older to use Gathr.",
      "Use your real name and a genuine profile. One account per person.",
      "Gathr is a free, independent project. It's provided as it is, and features may change or stop.",
    ],
  },
  {
    title: "Hosting and joining plans",
    items: [
      "Hosts are responsible for their plans: describe them honestly, including the price, skill level and anything people should bring.",
      "Prices shown are information only. Gathr doesn't handle payments; any money is settled between you and the host.",
      "If you can't make it, leave the plan or cancel it so others can take your spot.",
    ],
  },
  {
    title: "Meeting people safely",
    items: [
      "Gathr helps you find people; it doesn't run, supervise or insure any activity. You take part at your own risk.",
      "Meet in public places, tell a friend where you're going, and leave if anything feels wrong.",
      "Physical activities carry a risk of injury. Know your limits.",
    ],
  },
  {
    title: "What's not allowed",
    items: [
      "Harassment, hate, threats or discrimination.",
      "Spam, scams, selling, or promoting businesses disguised as plans.",
      "Anything illegal, sexual or dangerous.",
      "Sharing someone else's personal details without their consent.",
    ],
  },
  {
    title: "Moderation",
    items: [
      "Anyone can report a person, plan or message. Reports are reviewed by an admin.",
      "We may hide content or suspend accounts that break these rules, without notice.",
      "You can delete your account at any time from your profile.",
    ],
  },
];

// Fully static: prerendered at build time.
export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-12 sm:px-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-extrabold tracking-[-0.045em]">Terms</h1>
          <p className="text-muted-foreground">
            The ground rules, in plain language. By using Gathr you agree to them. Last updated{" "}
            {UPDATED}.
          </p>
        </div>
        {SECTIONS.map((section) => (
          <section key={section.title} className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold tracking-[-0.03em]">{section.title}</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-sm text-muted-foreground">
          See also our{" "}
          <Link href="/privacy" className="font-semibold text-foreground underline">
            privacy page
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
