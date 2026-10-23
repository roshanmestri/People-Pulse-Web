"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

import { uploadAvatar } from "../actions";

/** The avatar on /me doubles as the upload button. */
export function AvatarUpload({ name, image }: { name: string; image: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function upload(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.set("photo", file);
    startTransition(async () => {
      const result = await uploadAvatar(fd);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Photo updated");
      router.refresh();
    });
  }

  return (
    <label className="group relative cursor-pointer rounded-full focus-within:ring-2 focus-within:ring-ring">
      <Avatar className="size-20">
        {image ? <AvatarImage src={image} alt="" /> : null}
        <AvatarFallback className="bg-primary text-2xl font-extrabold text-primary-foreground">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full border-2 border-background bg-foreground text-background">
        <Camera className="size-4" aria-hidden="true" />
      </span>
      {pending ? (
        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50 text-xs font-bold text-white">
          Saving…
        </span>
      ) : null}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={image ? "Change profile photo" : "Add profile photo"}
        className="sr-only"
        disabled={pending}
        onChange={(e) => upload(e.target.files?.[0])}
      />
    </label>
  );
}
