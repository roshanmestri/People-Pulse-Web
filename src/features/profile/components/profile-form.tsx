"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoryPhoto } from "@/lib/category-media";
import { cn } from "@/lib/utils";

import { saveProfile } from "../actions";
import { AGE_RANGES, LANGUAGES, profileSchema, type ProfileInput } from "../schemas";
import { HomeAreaPicker } from "./home-area-picker";

type Category = { id: string; slug: string; name: string; icon: string };

type Props = {
  categories: Category[];
  defaultValues: ProfileInput;
  submitLabel: string;
  redirectTo?: string;
};

export function ProfileForm({ categories, defaultValues, submitLabel, redirectTo }: Props) {
  const router = useRouter();
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ProfileInput) {
    const result = await saveProfile(values);
    if (!result.ok) {
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof ProfileInput, { message });
      }
      toast.error(result.error);
      return;
    }
    toast.success("Profile saved");
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <Section title="What are you into?" hint="Pick a few — we'll show these first in Explore.">
        <Controller
          control={form.control}
          name="interestIds"
          render={({ field }) => (
            <div
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
              role="group"
              aria-label="Interests"
            >
              {categories.map((category) => {
                const selected = field.value.includes(category.id);
                const photo = categoryPhoto(category.slug);
                const toggle = () =>
                  field.onChange(
                    selected
                      ? field.value.filter((id) => id !== category.id)
                      : [...field.value, category.id],
                  );
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={toggle}
                    className={cn(
                      "relative flex h-24 items-end overflow-hidden rounded-2xl border-[3px] p-3 text-left transition",
                      selected ? "border-primary" : "border-transparent",
                      photo ? "bg-[#0a0a0c]" : "bg-muted",
                    )}
                  >
                    {photo ? (
                      <>
                        <Image src={photo} alt="" fill sizes="200px" className="object-cover" />
                        <span className="absolute inset-0 bg-gradient-to-b from-transparent to-black/75" />
                      </>
                    ) : (
                      <CategoryIcon
                        name={category.icon}
                        className="absolute top-3 left-3 size-6 text-brand-deep"
                      />
                    )}
                    <span
                      className={cn(
                        "relative text-sm leading-tight font-extrabold",
                        photo && "text-white",
                      )}
                    >
                      {category.name}
                    </span>
                    {selected ? (
                      <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-primary">
                        <Check
                          className="size-3.5 text-primary-foreground"
                          strokeWidth={3.5}
                          aria-hidden="true"
                        />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        />
        <FieldError message={errors.interestIds?.message} />
      </Section>

      <Section title="About you">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={errors.name?.message}>
            <Input
              id="name"
              autoComplete="name"
              className="h-12 rounded-xl"
              {...form.register("name")}
            />
          </Field>
          <Field
            label="Username"
            htmlFor="username"
            error={errors.username?.message}
            hint="Your profile link: gathr.app/u/username"
          >
            <Input
              id="username"
              autoComplete="username"
              className="h-12 rounded-xl"
              {...form.register("username")}
            />
          </Field>
        </div>
        <Field label="Short bio" htmlFor="bio" error={errors.bio?.message}>
          <Textarea
            id="bio"
            rows={3}
            placeholder="Weekend footballer, weekday dev. Always up for a trek."
            className="rounded-xl"
            {...form.register("bio")}
          />
        </Field>
        <Field label="Age range (optional)" htmlFor="ageRange">
          <Controller
            control={form.control}
            name="ageRange"
            render={({ field }) => (
              <select
                id="ageRange"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                className="h-12 rounded-xl border bg-background px-3"
              >
                <option value="">Prefer not to say</option>
                {AGE_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            )}
          />
        </Field>
        <Controller
          control={form.control}
          name="languages"
          render={({ field }) => (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-bold">Languages you speak</legend>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((language) => {
                  const on = field.value.includes(language);
                  return (
                    <button
                      key={language}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        field.onChange(
                          on
                            ? field.value.filter((l) => l !== language)
                            : [...field.value, language],
                        )
                      }
                      className={cn(
                        "h-10 rounded-full border px-4 text-sm",
                        on
                          ? "border-foreground bg-foreground font-bold text-background"
                          : "font-semibold",
                      )}
                    >
                      {language}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        />
      </Section>

      <Section title="Your home area" hint="Used to show plans near you.">
        <Controller
          control={form.control}
          name="home"
          render={({ field }) => <HomeAreaPicker value={field.value} onChange={field.onChange} />}
        />
      </Section>

      <div className="sticky bottom-24 z-10 md:bottom-4">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="h-14 w-full rounded-2xl text-base font-extrabold shadow-lg"
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-extrabold tracking-[-0.02em]">{title}</h2>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="font-bold">
        {label}
      </Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm font-semibold text-destructive">{message}</p> : null;
}
