import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Gathr stores about you, who can see it, and how to delete it.",
};

const UPDATED = "28 October 2026";

const SECTIONS = [
  {
    title: "What we store",
    items: [
      "Your account: name, email and profile photo from Google (or the email you sign in with).",
      "Your profile: username, bio, interests, languages and optional age range.",
      "Your home area. We keep the coordinates to sort plans by distance, but only the area name (e.g. “Indiranagar”) is ever shown to anyone.",
      "Plans you host or join, your join requests, group chat messages and notifications.",
      "Reports and blocks you make, so moderators can act on them.",
      "Sign-in sessions, including the IP address and browser they came from, to keep your account secure.",
    ],
  },
  {
    title: "Who can see what",
    items: [
      "Anyone can see a plan's title, photo, time, price, area and rough location, plus the host's public profile.",
      "A plan's exact venue is shown only to members the host has accepted, and only if the host chooses to show it.",
      "Group chats are visible only to the host and accepted members.",
      "Your email address and exact home location are never shown to other users.",
      "Admins can see reported content in order to moderate it.",
    ],
  },
  {
    title: "Services we use",
    items: [
      "Vercel hosts the app and stores uploaded photos (Vercel Blob).",
      "Neon hosts the database.",
      "Google handles “Continue with Google” sign-in. We only ask for your name, email and profile picture.",
      "Photos you upload are re-encoded, which removes hidden data such as the GPS location stored by phone cameras.",
    ],
  },
  {
    title: "What we don't do",
    items: [
      "We don't sell your data or show ads.",
      "We don't take payments. Prices on plans are information only.",
      "We don't use tracking or advertising cookies. Our only cookies keep you signed in.",
    ],
  },
  {
    title: "Deleting your data",
    items: [
      "Go to your profile (Me) and choose “Delete account”. Your profile, plans, requests, messages and notifications are removed straight away.",
      "You can also sign out of every device from the same page.",
    ],
  },
];

// Fully static, like the landing page: prerendered at build time.
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-12 sm:px-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-extrabold tracking-[-0.045em]">Privacy</h1>
          <p className="text-muted-foreground">
            Gathr helps you meet people nearby, so it needs a little information about you. This
            page explains what, and who sees it. Last updated {UPDATED}.
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
          Questions? Use the report button on any profile or plan, or read our{" "}
          <Link href="/#safety" className="font-semibold text-foreground underline">
            safety tips
          </Link>
          .
        </p>
      </main>
    </>
  );
}
