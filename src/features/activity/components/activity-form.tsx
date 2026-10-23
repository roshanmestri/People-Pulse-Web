"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Minus, Plus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { VerifiedBadge } from "@/components/brand/verified-badge";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoryPhoto } from "@/lib/category-media";
import { checkImageFile } from "@/lib/image-rules";
import type { LatLng } from "@/lib/geo";
import { formatDay, formatDuration, formatTime, istToUtc } from "@/lib/time";
import { cn } from "@/lib/utils";

import { createActivity, updateActivity } from "../actions";
import { activitySchema, DURATIONS, MAX_PRICE, SKILL_LEVELS, type ActivityInput } from "../schemas";
import { VenuePicker } from "./venue-picker";

type Category = { id: string; slug: string; name: string; icon: string };

type Props = {
  categories: Category[];
  defaultValues: ActivityInput;
  fallbackCenter: LatLng;
  host: { name: string; verified: boolean };
  /** Edit mode: the activity being edited. */
  existing?: { id: string; status: string; coverImage: string | null };
};

const PRICE_PRESETS = [0, 50, 100, 200];
const SKILL_LABEL: Record<(typeof SKILL_LEVELS)[number], string> = {
  ANY: "Any level",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  PRO: "Pro",
};

export function ActivityForm({ categories, defaultValues, fallbackCenter, host, existing }: Props) {
  const router = useRouter();
  const form = useForm<ActivityInput>({ resolver: zodResolver(activitySchema), defaultValues });
  const { errors, isSubmitting } = form.formState;
  const values = useWatch({ control: form.control });

  const [cover, setCover] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  useEffect(
    () => () => (coverPreview ? URL.revokeObjectURL(coverPreview) : undefined),
    [coverPreview],
  );

  const category = categories.find((c) => c.id === values.categoryId);
  const previewImage =
    coverPreview ??
    (!coverRemoved && existing?.coverImage) ??
    (category ? categoryPhoto(category.slug) : null);

  const isDraftOrNew = !existing || existing.status === "DRAFT";

  async function submit(intent: "publish" | "draft") {
    await form.handleSubmit(async (data) => {
      const fd = new FormData();
      fd.set("data", JSON.stringify(data));
      if (cover) fd.set("cover", cover);
      if (coverRemoved) fd.set("removeCover", "true");
      let result: Awaited<ReturnType<typeof createActivity>>;
      try {
        result = existing
          ? await updateActivity(existing.id, fd, intent)
          : await createActivity(fd, intent);
      } catch {
        // Network drop or an unexpected server error — never leave the user with a silent failure.
        toast.error("Couldn't save — check your connection and try again.");
        return;
      }
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(field as keyof ActivityInput, { message });
        }
        toast.error(result.error);
        return;
      }
      toast.success(
        intent === "draft" ? "Draft saved" : existing ? "Plan updated" : "Your plan is live!",
      );
      router.push(`/activities/${result.id}`);
    })();
  }

  return (
    <div className="flex flex-wrap items-start gap-8">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit("publish");
        }}
        className="flex min-w-0 flex-[999_1_560px] flex-col gap-5"
      >
        {/* ── What ─────────────────────────────────────────────── */}
        <Card title="What are you doing?">
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <div
                role="radiogroup"
                aria-label="Category"
                className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
              >
                {categories.map((c, index) => {
                  const selected = field.value === c.id;
                  const photo = categoryPhoto(c.slug);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => field.onChange(c.id)}
                      className={cn(
                        "relative flex h-20 items-end overflow-hidden rounded-2xl border-[3px] p-2.5 text-left",
                        selected ? "border-primary" : "border-transparent",
                        photo ? "bg-[#0a0a0c]" : "bg-muted",
                      )}
                    >
                      {photo ? (
                        <>
                          <Image
                            src={photo}
                            alt=""
                            fill
                            sizes="180px"
                            className="object-cover"
                            loading={index < 4 ? "eager" : "lazy"}
                          />
                          <span className="absolute inset-0 bg-gradient-to-b from-transparent to-black/75" />
                        </>
                      ) : (
                        <CategoryIcon
                          name={c.icon}
                          className="absolute top-2.5 left-2.5 size-5 text-brand-deep"
                        />
                      )}
                      <span
                        className={cn(
                          "relative text-[13px] leading-tight font-extrabold",
                          photo && "text-white",
                        )}
                      >
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          />
          <FieldError message={errors.categoryId?.message} />
          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input
              id="title"
              placeholder="e.g. Doubles badminton — need 1 more"
              className="h-12 rounded-xl"
              {...form.register("title")}
            />
          </Field>
          <Field label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea
              id="description"
              rows={4}
              placeholder="Who's it for? What's the vibe? Anything people should know?"
              className="rounded-xl"
              {...form.register("description")}
            />
          </Field>
        </Card>

        {/* ── When & where ─────────────────────────────────────── */}
        <Card title="When & where">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date" htmlFor="date" error={errors.date?.message}>
              <Input id="date" type="date" className="h-12 rounded-xl" {...form.register("date")} />
            </Field>
            <Field label="Start time (IST)" htmlFor="time" error={errors.time?.message}>
              <Input id="time" type="time" className="h-12 rounded-xl" {...form.register("time")} />
            </Field>
          </div>
          <Controller
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-bold">How long?</legend>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((m) => (
                    <Chip key={m} on={field.value === m} onClick={() => field.onChange(m)}>
                      {formatDuration(m)}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold">Venue</span>
            <Controller
              control={form.control}
              name="venue"
              render={({ field }) => (
                <VenuePicker
                  value={field.value}
                  onChange={field.onChange}
                  fallbackCenter={fallbackCenter}
                />
              )}
            />
            <FieldError
              message={
                errors.venue?.message ??
                errors.venue?.venueName?.message ??
                errors.venue?.areaName?.message
              }
            />
          </div>
          <Controller
            control={form.control}
            name="hideExactVenue"
            render={({ field }) => (
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  aria-labelledby="hide-venue-label"
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    "relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors",
                    field.value ? "bg-primary" : "bg-input",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-[3px] size-6 rounded-full bg-white shadow transition-all",
                      field.value ? "left-[23px]" : "left-[3px]",
                    )}
                  />
                </button>
                <span id="hide-venue-label" className="text-sm">
                  <strong className="font-bold">Hide exact venue until people are in</strong>
                  <br />
                  <span className="text-muted-foreground">
                    Others see only &ldquo;{values.venue?.areaName || "the area"}&rdquo; and a rough
                    circle on the map.
                  </span>
                </span>
              </div>
            )}
          />
        </Card>

        {/* ── People & price ───────────────────────────────────── */}
        <Card title="People & price">
          <div className="flex flex-wrap gap-8">
            <Controller
              control={form.control}
              name="maxPeople"
              render={({ field }) => (
                <Stepper
                  label="Spots (not counting you)"
                  value={field.value}
                  min={1}
                  max={50}
                  onChange={field.onChange}
                  error={errors.maxPeople?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="minPeople"
              render={({ field }) => (
                <Stepper
                  label="Need at least"
                  value={field.value}
                  min={1}
                  max={50}
                  onChange={field.onChange}
                  error={errors.minPeople?.message}
                />
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="pricePerPerson"
            render={({ field }) => (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-bold">Price per person</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {PRICE_PRESETS.map((p) => (
                    <Chip key={p} on={field.value === p} onClick={() => field.onChange(p)}>
                      {p === 0 ? "Free" : `₹${p}`}
                    </Chip>
                  ))}
                  <label className="flex h-10 items-center gap-1 rounded-full border px-3 text-sm font-semibold">
                    ₹
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={MAX_PRICE}
                      aria-label="Custom price per person"
                      value={PRICE_PRESETS.includes(field.value) ? "" : field.value}
                      placeholder="Other"
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : Math.floor(Number(e.target.value)),
                        )
                      }
                      className="w-20 bg-transparent outline-none"
                    />
                  </label>
                </div>
                <FieldError message={errors.pricePerPerson?.message} />
              </fieldset>
            )}
          />
          <Field
            label="Price note (optional)"
            htmlFor="priceNote"
            error={errors.priceNote?.message}
            hint="Gathr doesn't handle payments — people pay you or the venue directly."
          >
            <Input
              id="priceNote"
              placeholder="e.g. court fee, split at the venue"
              className="h-11 rounded-xl"
              {...form.register("priceNote")}
            />
          </Field>

          <Controller
            control={form.control}
            name="joinMode"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Join mode" className="grid gap-2.5 sm:grid-cols-2">
                {(
                  [
                    [
                      "REQUEST",
                      "Request to join",
                      "You approve each person — best for skill-based or small groups.",
                    ],
                    ["OPEN", "Open", "Anyone can join instantly until it fills up."],
                  ] as const
                ).map(([mode, label, hint]) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={field.value === mode}
                    onClick={() => field.onChange(mode)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-2xl p-4 text-left",
                      field.value === mode ? "border-2 border-primary bg-accent" : "border",
                    )}
                  >
                    <strong className="font-extrabold">{label}</strong>
                    <span className="text-[13px] text-muted-foreground">{hint}</span>
                  </button>
                ))}
              </div>
            )}
          />
        </Card>

        {/* ── Extras ───────────────────────────────────────────── */}
        <Card title="Extras" hint="Optional — help people decide.">
          <Controller
            control={form.control}
            name="skillLevel"
            render={({ field }) => (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-bold">Skill level</legend>
                <div className="flex flex-wrap gap-2">
                  {SKILL_LEVELS.map((level) => (
                    <Chip
                      key={level}
                      on={field.value === level}
                      onClick={() => field.onChange(level)}
                    >
                      {SKILL_LABEL[level]}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="What to bring" htmlFor="whatToBring" error={errors.whatToBring?.message}>
              <Input
                id="whatToBring"
                placeholder="Racquet, water, sports shoes"
                className="h-11 rounded-xl"
                {...form.register("whatToBring")}
              />
            </Field>
            <Field
              label="Preference (shown, not enforced)"
              htmlFor="preferenceNote"
              error={errors.preferenceNote?.message}
            >
              <Input
                id="preferenceNote"
                placeholder="e.g. Women-led session; everyone welcome"
                className="h-11 rounded-xl"
                {...form.register("preferenceNote")}
              />
            </Field>
          </div>
          <Controller
            control={form.control}
            name="tags"
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                error={errors.tags?.message ?? errors.tags?.[0]?.message}
              />
            )}
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold">Cover photo</span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-bold">
                <ImagePlus className="size-4" aria-hidden="true" />
                {cover || (existing?.coverImage && !coverRemoved) ? "Change photo" : "Upload photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    const problem = file && checkImageFile(file);
                    if (problem) {
                      toast.error(problem);
                      e.target.value = "";
                      return;
                    }
                    setCover(file);
                    setCoverRemoved(false);
                  }}
                />
              </label>
              {cover || (existing?.coverImage && !coverRemoved) ? (
                <button
                  type="button"
                  onClick={() => {
                    setCover(null);
                    setCoverRemoved(true);
                  }}
                  className="text-sm font-bold text-muted-foreground underline"
                >
                  Remove
                </button>
              ) : (
                <span className="text-sm text-muted-foreground">
                  No photo? We&apos;ll use the category picture.
                </span>
              )}
            </div>
            <FieldError message={(errors as Record<string, { message?: string }>).cover?.message} />
          </div>
        </Card>
      </form>

      {/* ── Live preview + actions ─────────────────────────────── */}
      <aside className="flex w-full flex-[1_1_320px] flex-col gap-3.5 lg:sticky lg:top-24 lg:max-w-sm">
        <span className="text-[13px] font-extrabold tracking-wider text-muted-foreground uppercase">
          Live preview
        </span>
        <div className="flex flex-col gap-3.5 rounded-3xl border bg-card p-3 shadow-[0_16px_40px_rgb(15_15_16/0.08)]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            {previewImage ? (
              <Image
                src={previewImage}
                alt=""
                fill
                sizes="400px"
                className="object-cover"
                loading="eager"
                // A just-picked file is a local blob: URL, which the image optimizer can't fetch.
                unoptimized={Boolean(coverPreview)}
              />
            ) : null}
            <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-[#0f0f10]">
              {previewWhen(values.date, values.time)}
            </span>
            <span className="absolute top-3 right-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-extrabold text-white">
              {values.maxPeople ?? 0} spots left
            </span>
          </div>
          <div className="flex flex-col gap-1.5 px-1.5 pb-1.5">
            <div className="flex justify-between gap-2.5">
              <strong className="text-lg leading-snug font-extrabold tracking-[-0.02em]">
                {values.title?.trim() || "Your plan title"}
              </strong>
              <span className="shrink-0 font-extrabold">
                {values.pricePerPerson ? `₹${values.pricePerPerson}` : "Free"}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {values.venue?.areaName || "Pick a venue"} ·{" "}
              {formatDuration(values.durationMinutes ?? 60)} ·{" "}
              {values.joinMode === "OPEN" ? "Open" : "Request to join"}
            </span>
            <span className="flex items-center gap-1.5 border-t pt-2.5 text-[13px] text-muted-foreground">
              Hosted by <strong className="text-foreground">{host.name || "you"}</strong>
              {host.verified ? <VerifiedBadge className="size-3.5" /> : null}
            </span>
          </div>
        </div>
        <Button
          type="button"
          size="lg"
          disabled={isSubmitting}
          onClick={() => submit("publish")}
          className="h-14 rounded-2xl text-base font-extrabold"
        >
          {isSubmitting ? "Saving…" : isDraftOrNew ? "Publish plan" : "Save changes"}
        </Button>
        {isDraftOrNew ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isSubmitting}
            onClick={() => submit("draft")}
            className="h-12 rounded-2xl font-bold"
          >
            Save draft
          </Button>
        ) : null}
        {category ? (
          <p className="text-[13px] text-muted-foreground">
            People nearby who follow {category.name} see it first.
          </p>
        ) : null}
      </aside>
    </div>
  );
}

function previewWhen(date?: string, time?: string) {
  if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return "Pick a time";
  const d = istToUtc(date, time);
  return `${formatDay(d)} · ${formatTime(d)}`;
}

function Card({
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
      <div>
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

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-10 rounded-full border px-4 text-sm",
        on ? "border-foreground bg-foreground font-extrabold text-background" : "font-semibold",
      )}
    >
      {children}
    </button>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  error,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold">{label}</span>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid size-11 place-items-center rounded-xl border"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <strong className="min-w-9 text-center text-2xl font-extrabold" aria-live="polite">
          {value}
        </strong>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid size-11 place-items-center rounded-xl border"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      <FieldError message={error} />
    </div>
  );
}

function TagInput({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const tag = draft.trim().toLowerCase().replace(/\s+/g, "-").replace(/^#/, "");
    if (tag && !value.includes(tag) && value.length < 5) onChange([...value, tag]);
    setDraft("");
  }
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="tag-input" className="font-bold">
        Tags <span className="font-normal text-muted-foreground">(up to 5)</span>
      </Label>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border p-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-muted py-1 pr-1.5 pl-3 text-sm font-semibold"
          >
            #{tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id="tag-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={value.length < 5 ? "badminton, doubles…" : ""}
          disabled={value.length >= 5}
          className="min-w-32 flex-1 bg-transparent px-1 text-sm outline-none"
        />
      </div>
      <FieldError message={error} />
    </div>
  );
}
