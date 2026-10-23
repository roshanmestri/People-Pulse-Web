import Image from "next/image";
import Link from "next/link";

/** Placeholder for screens that later milestones build (keeps nav links from 404-ing). */
export function ComingSoon({
  title,
  milestone,
  body,
  image = "/images/run.jpg",
}: {
  title: string;
  milestone: string;
  body: string;
  image?: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center">
      <div className="relative h-48 w-full overflow-hidden rounded-3xl bg-muted">
        <Image
          src={image}
          alt=""
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          className="object-cover"
        />
        <span className="absolute top-4 left-4 rounded-full bg-background px-3 py-1.5 text-xs font-extrabold">
          Coming in {milestone}
        </span>
      </div>
      <h1 className="text-3xl font-extrabold tracking-[-0.04em]">{title}</h1>
      <p className="max-w-md text-muted-foreground">{body}</p>
      <Link
        href="/me"
        className="rounded-full bg-primary px-5 py-3 font-extrabold text-primary-foreground"
      >
        Finish your profile
      </Link>
    </section>
  );
}
