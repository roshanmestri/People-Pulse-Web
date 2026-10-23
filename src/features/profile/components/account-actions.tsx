"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** FR-1.3: sign out everywhere, delete account. */
export function AccountActions() {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function signOutEverywhere() {
    await authClient.revokeSessions();
    await authClient.signOut();
    toast.success("Signed out on all devices");
    router.push("/");
    router.refresh();
  }

  async function deleteAccount() {
    const { error } = await authClient.deleteUser();
    if (error) {
      toast.error(error.message ?? "Couldn't delete your account. Sign in again and retry.");
      return;
    }
    toast.success("Your account was deleted");
    router.push("/");
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-[-0.02em]">Account</h2>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="h-11 rounded-full font-bold"
          onClick={signOutEverywhere}
        >
          Sign out of all devices
        </Button>
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">
              This removes your profile, plans and messages.
            </span>
            <Button
              variant="destructive"
              className="h-11 rounded-full font-bold"
              onClick={deleteAccount}
            >
              Yes, delete my account
            </Button>
            <Button
              variant="ghost"
              className="h-11 rounded-full"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="h-11 rounded-full font-bold text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            Delete account
          </Button>
        )}
      </div>
    </section>
  );
}
