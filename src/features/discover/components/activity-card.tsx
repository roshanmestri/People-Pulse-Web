import Image from "next/image";
import Link from "next/link";

import { VerifiedBadge } from "@/components/brand/verified-badge";
import { categoryPhoto } from "@/lib/category-media";
import { formatDay, formatTime } from "@/lib/time";
import { cn, initials } from "@/lib/utils";

import type { DiscoverItem } from "../queries";

export function formatDistance(metres: number) {
  return metres < 1000
    ? `${Math.max(100, Math.round(metres / 100) * 100)} m`
    : `${(metres / 1000).toFixed(1)} km`;
}

function spots(item: Pick<DiscoverItem, "maxPeople" | "going" | "status">) {
  const left = Math.max(item.maxPeople - item.going, 0);
  if (item.status === "FULL" || left === 0) return { label: "Full", hot: false, full: true };
  return { label: left === 1 ? "1 spot left" : `${left} spots left`, hot: left <= 2, full: false };
}

/**
 * The v2 photo card. No hooks or browser APIs, so it renders on the server for the
 * first page and inside the client "Load more" list for later pages.
 */
export function ActivityCard({ item, eager = false }: { item: DiscoverItem; eager?: boolean }) {
  const s = spots(item);
  const photo = item.coverImage ?? categoryPhoto(item.categorySlug) ?? "/images/hero-football.jpg";
  return (
    <Link
      href={`/activities/${item.id}`}
      className="group flex flex-col gap-3.5 rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-muted">
        <Image
          src={photo}
          alt=""
          fill
          sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
          loading={eager ? "eager" : "lazy"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[#0f0f10]">
          {formatDay(item.startsAt)} · {formatTime(item.startsAt)}
        </span>
        <span
          className={cn(
            "absolute top-3 right-3 rounded-full px-3 py-1.5 text-xs font-extrabold",
            s.hot ? "bg-primary text-primary-foreground" : "bg-black/70 text-white",
          )}
        >
          {s.label}
        </span>
        {item.going > 0 ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white">
            {item.going} going
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 px-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg leading-snug font-extrabold tracking-[-0.02em]">{item.title}</h3>
          <span className="shrink-0 font-extrabold">
            {item.pricePerPerson ? `₹${item.pricePerPerson}` : "Free"}
          </span>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {item.areaName} · {formatDistance(item.distanceM)} · {item.categoryName}
        </span>
        <span className="mt-1 flex items-center gap-2 border-t pt-2.5 text-[13px] text-muted-foreground">
          <span className="grid size-6 place-items-center rounded-full bg-secondary text-[10px] font-extrabold text-foreground">
            {initials(item.hostName)}
          </span>
          Hosted by{" "}
          <strong className="font-bold text-foreground">{item.hostName.split(" ")[0]}</strong>
          {item.hostVerified ? <VerifiedBadge className="size-3.5" /> : null}
          <span className="ml-auto font-semibold">
            {item.joinMode === "OPEN" ? "Instant join" : "Request"}
          </span>
        </span>
      </div>
    </Link>
  );
}
