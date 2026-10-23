import { Lock, MessageCircleOff, Flag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { VerifiedBadge } from "@/components/brand/verified-badge";
import { SiteHeader } from "@/components/layout/site-header";

const TILES = [
  {
    label: "Football",
    img: "/images/football.jpg",
    slug: "sports-fitness",
    span: "md:col-span-2 md:row-span-2",
  },
  { label: "Badminton", img: "/images/badminton.jpg", slug: "sports-fitness", span: "" },
  { label: "Treks", img: "/images/trek.jpg", slug: "outdoors-travel", span: "" },
  { label: "Music", img: "/images/jam.jpg", slug: "music", span: "" },
  { label: "Yoga", img: "/images/yoga.jpg", slug: "wellness", span: "" },
  { label: "Food & social", img: "/images/food.jpg", slug: "food-social", span: "md:col-span-2" },
  {
    label: "Volunteering",
    img: "/images/cleanup.jpg",
    slug: "cleanliness-drives",
    span: "md:col-span-2",
  },
];

const STEPS = [
  {
    title: "Find a plan",
    body: "Browse by sport, time and distance. Every plan shows who's going, spots left and the price.",
  },
  {
    title: "Tap “I'm in”",
    body: "Open plans confirm instantly. Others go to the host, who sees your profile and says yes.",
  },
  {
    title: "Chat & show up",
    body: "A group chat opens with the exact venue. Sort the details, then go play.",
  },
];

// Fully static: no request data, so the whole page is prerendered at build time.
export default function LandingPage() {
  return (
    <>
      <section className="relative isolate flex min-h-[640px] overflow-hidden bg-[#0a0a0c] md:min-h-[720px]">
        <Image
          src="/images/hero-football.jpg"
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="-z-10 object-cover object-[60%_50%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/35 to-black/90" />
        <SiteHeader tone="overlay" />
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-end gap-6 px-4 pt-28 pb-16 sm:px-8">
          <span className="self-start rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[13px] font-bold text-white">
            Live in Pune · Mumbai · Sangli
          </span>
          <h1 className="max-w-4xl text-5xl leading-[0.95] font-extrabold tracking-[-0.055em] text-white sm:text-7xl md:text-[92px]">
            Find your people.
            <br />
            <span className="text-primary">Play tonight.</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">
            Football at 9, a trek at sunrise, a jam on Saturday. See what&apos;s happening within a
            few kilometres — and join in two taps.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="rounded-full bg-primary px-6 py-4 text-base font-extrabold text-primary-foreground sm:text-lg"
            >
              Explore near me
            </Link>
            <Link
              href="/activities/new"
              className="rounded-full border border-white/35 bg-white/10 px-6 py-4 text-base font-bold text-white sm:text-lg"
            >
              Host a plan
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-8">
        <section className="flex flex-col gap-7 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="max-w-2xl text-3xl leading-[1.05] font-extrabold tracking-[-0.045em] sm:text-[44px]">
              Whatever you&apos;re into, someone nearby is too.
            </h2>
            <Link href="/explore" className="rounded-full border px-4 py-3 text-[15px] font-bold">
              See all 18 categories
            </Link>
          </div>
          <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4 md:gap-4">
            {TILES.map((tile) => (
              <Link
                key={tile.label}
                href={`/explore?cat=${tile.slug}`}
                className={`group relative overflow-hidden rounded-[22px] bg-muted ${tile.span}`}
              >
                <Image
                  src={tile.img}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-black/80" />
                <strong className="absolute bottom-4 left-4 text-xl font-extrabold tracking-[-0.03em] text-white">
                  {tile.label}
                </strong>
              </Link>
            ))}
          </div>
        </section>

        <section id="how" className="flex flex-col gap-7 pb-14">
          <h2 className="text-3xl font-extrabold tracking-[-0.045em] sm:text-[44px]">
            Three taps to your next game
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col gap-3 rounded-3xl bg-muted p-7">
                <span className="grid size-11 place-items-center rounded-[14px] bg-primary font-extrabold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="text-[22px] font-extrabold tracking-[-0.03em]">{step.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="safety" className="pb-14">
          <div className="flex flex-wrap items-center gap-8 rounded-[28px] bg-[#0f0f10] p-8 text-white sm:p-10">
            <div className="flex flex-[1_1_360px] flex-col gap-3">
              <h2 className="text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                Meet people, safely.
              </h2>
              <p className="max-w-md leading-relaxed text-white/75">
                Exact venues stay hidden until you&apos;re in. Verified hosts, one-tap report and
                block, and no DMs from strangers.
              </p>
            </div>
            <ul className="grid flex-[1_1_380px] grid-cols-2 gap-3 text-[15px] font-bold">
              <li className="flex items-center gap-2.5 rounded-2xl bg-white/8 p-4">
                <VerifiedBadge className="size-5" /> Verified hosts
              </li>
              <li className="flex items-center gap-2.5 rounded-2xl bg-white/8 p-4">
                <Lock className="size-5 text-primary" aria-hidden="true" /> Private venues
              </li>
              <li className="flex items-center gap-2.5 rounded-2xl bg-white/8 p-4">
                <Flag className="size-5 text-primary" aria-hidden="true" /> Report &amp; block
              </li>
              <li className="flex items-center gap-2.5 rounded-2xl bg-white/8 p-4">
                <MessageCircleOff className="size-5 text-primary" aria-hidden="true" /> No stranger
                DMs
              </li>
            </ul>
          </div>
        </section>

        <section className="pb-20">
          <div className="relative isolate flex min-h-80 items-center overflow-hidden rounded-[28px]">
            <Image src="/images/run.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
            <span className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 to-black/30" />
            <div className="flex max-w-xl flex-col gap-4 p-8 sm:p-12">
              <h2 className="text-4xl leading-none font-extrabold tracking-[-0.05em] text-white sm:text-5xl">
                Got a plan? Host it.
              </h2>
              <p className="text-white/80">
                Post what, where and when in under a minute. People nearby who are into it will see
                it first.
              </p>
              <Link
                href="/activities/new"
                className="self-start rounded-full bg-primary px-6 py-3.5 font-extrabold text-primary-foreground"
              >
                Host a plan
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/60">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-4 py-7 text-sm text-muted-foreground sm:px-8">
          <span>© 2026 gathr</span>
          <span className="flex gap-5">
            <Link href="/#safety">Safety</Link>
            <span>Privacy</span>
            <span>Terms</span>
          </span>
        </div>
      </footer>
    </>
  );
}
