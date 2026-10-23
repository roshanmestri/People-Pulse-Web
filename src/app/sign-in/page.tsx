import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { isGoogleEnabled } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0a0a0c] lg:block">
        <Image
          src="/images/run.jpg"
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />
        <div className="absolute inset-x-10 bottom-10 flex flex-col gap-3 text-white">
          <p className="text-5xl leading-none font-extrabold tracking-[-0.05em]">
            Your next game is
            <br />
            <span className="text-primary">2 km away.</span>
          </p>
          <p className="max-w-sm text-white/80">
            Sign in to join plans, chat with your group and host your own.
          </p>
        </div>
      </div>

      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-12">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-[-0.045em]">Welcome to Gathr</h1>
            <p className="text-muted-foreground">
              Sign in or create an account — it&apos;s the same step.
            </p>
          </div>
          {/* searchParams and the session are request data → stream them in. */}
          <Suspense fallback={<div className="h-56 animate-pulse rounded-2xl bg-muted" />}>
            <SignInGate searchParams={searchParams} />
          </Suspense>
          <p className="text-xs leading-relaxed text-muted-foreground">
            By continuing you agree to meet people in public places and follow our community
            guidelines.
          </p>
        </div>
      </div>
    </div>
  );
}

async function SignInGate({
  searchParams,
}: {
  searchParams: PageProps<"/sign-in">["searchParams"];
}) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  if (await getSessionUser()) redirect(next);
  return <SignInForm next={next} googleEnabled={isGoogleEnabled} />;
}
