"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileActionState } from "@/lib/actions/profile";

type Profile = {
  name: string;
  eFootballGamertag: string | null;
  eFootballPlatform: string | null;
  eFootballPlayerId: string | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<ProfileActionState, FormData>(updateProfile, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Display name</label>
        <input
          name="name"
          type="text"
          required
          minLength={2}
          defaultValue={profile.name}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">eFootball gamertag</label>
        <input
          name="eFootballGamertag"
          type="text"
          defaultValue={profile.eFootballGamertag ?? ""}
          placeholder="e.g. Cruyff_Fan_10"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Platform</label>
          <select
            name="eFootballPlatform"
            defaultValue={profile.eFootballPlatform ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Select platform</option>
            <option value="PS">PlayStation</option>
            <option value="XBOX">Xbox</option>
            <option value="PC">PC</option>
            <option value="MOBILE">Mobile</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">eFootball player ID</label>
          <input
            name="eFootballPlayerId"
            type="text"
            defaultValue={profile.eFootballPlayerId ?? ""}
            placeholder="Konami ID"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>
      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          {state.success}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
