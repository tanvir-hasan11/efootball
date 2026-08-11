"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerUser, type AuthState } from "@/lib/actions/auth";

const platforms = [
  { value: "PS", label: "PlayStation" },
  { value: "XBOX", label: "Xbox" },
  { value: "PC", label: "PC / Steam" },
  { value: "MOBILE", label: "Mobile" },
];

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(registerUser, undefined);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Link your eFootball identity and start competing.
      </p>

      {state?.error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input
              name="name"
              required
              minLength={2}
              autoComplete="name"
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">Account type</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="PLAYER" defaultChecked />
            Player — compete in tournaments
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="ORGANIZER" />
            Organizer — create and run tournaments
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="BOTH" />
            Player &amp; Organizer
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <legend className="text-sm font-medium">eFootball identity (optional)</legend>
          <label className="flex flex-col gap-1 text-sm">
            In-game name
            <input
              name="eFootballGamertag"
              placeholder="e.g. BeastModeFC"
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Platform
              <select
                name="eFootballPlatform"
                defaultValue=""
                className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">Select platform</option>
                {platforms.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Player ID
              <input
                name="eFootballPlayerId"
                placeholder="Optional"
                className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
