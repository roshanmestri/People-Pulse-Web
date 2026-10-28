import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "About",
  description: "Why Gathr exists, and who's building it.",
};

// Fully static: prerendered at build time.
export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-12 sm:px-8">
        <div className="relative h-56 overflow-hidden rounded-3xl bg-muted sm:h-72">
          <Image
            src="/images/football.jpg"
            alt="A group of friends warming up before a football game"
            fill
            priority
            sizes="(min-width: 640px) 640px, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-4xl leading-[1.05] font-extrabold tracking-[-0.045em] sm:text-5xl">
            Plans shouldn&apos;t die in the group chat.
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Someone says &ldquo;football this weekend?&rdquo;, three people reply, and it never
            happens. Or you want to go on a trek and none of your friends are free — while somebody
            a couple of kilometres away wants exactly the same thing.
          </p>
        </div>

        <section className="flex flex-col gap-3 leading-relaxed">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">What Gathr does</h2>
          <p>
            Gathr shows you real, offline plans happening near you — a 7 am run, badminton after
            work, a jam on Saturday, a beach clean-up — and lets you join in two taps. Hosts see
            who&apos;s coming, a group chat opens for everyone who&apos;s in, and you go and do the
            thing.
          </p>
          <p>
            Safety is built in, not bolted on: your exact location is never shown (only your area),
            venues are revealed only to people who are going, there are no DMs from strangers, and
            anyone can be reported or blocked in one tap.
          </p>
        </section>

        <section className="flex flex-col gap-3 leading-relaxed">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Who&apos;s behind it</h2>
          <p>
            Hi, I&apos;m Roshan — a frontend engineer. Gathr is my independent project: I wanted to
            learn every layer of building a real product (database, backend, maps, sign-in,
            deployment) and to fix a problem I kept running into myself. There&apos;s no company, no
            ads and no investors — just an app that gets useful once enough people nearby use it.
          </p>
          <p>
            It&apos;s new and starting in Pune, Mumbai and Sangli. If something&apos;s broken or
            confusing, that&apos;s genuinely useful to hear — use the report button on any page, or
            tell the person who shared the link with you.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/explore"
            className="rounded-full bg-primary px-6 py-3.5 font-extrabold text-primary-foreground"
          >
            See what&apos;s nearby
          </Link>
          <Link href="/activities/new" className="rounded-full border px-6 py-3.5 font-bold">
            Host a plan
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
