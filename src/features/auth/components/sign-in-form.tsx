"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const schema = z.object({ email: z.email("Enter a valid email address") });
type Values = z.infer<typeof schema>;

export function SignInForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit({ email }: Values) {
    setError(null);
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: next,
      newUserCallbackURL: "/onboarding",
      errorCallbackURL: "/sign-in?error=link",
    });
    if (error) setError(error.message ?? "Couldn't send the link. Try again in a minute.");
    else setSentTo(email);
  }

  async function google() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: next,
      newUserCallbackURL: "/onboarding",
    });
  }

  if (sentTo) {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-2xl bg-accent p-6 text-accent-foreground"
      >
        <MailCheck className="size-7" aria-hidden="true" />
        <p className="text-lg font-extrabold text-foreground">Check your inbox</p>
        <p className="text-sm">
          We sent a sign-in link to <strong>{sentTo}</strong>. It expires in 15 minutes.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="self-start text-sm font-bold underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {googleEnabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 rounded-full font-bold"
            onClick={google}
          >
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="font-bold">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-12 rounded-xl"
            aria-invalid={Boolean(form.formState.errors.email)}
            aria-describedby={form.formState.errors.email ? "email-error" : undefined}
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p id="email-error" className="text-sm font-semibold text-destructive">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-12 rounded-full text-base font-extrabold"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Sending…" : "Email me a sign-in link"}
        </Button>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
