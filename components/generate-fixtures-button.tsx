"use client";

import { useActionState } from "react";
import { generateFixtures, type FixtureActionState } from "@/lib/actions/fixtures";

export function GenerateFixturesButton({ tournamentId }: { tournamentId: string }) {
  const [state, formAction, pending] = useActionState<FixtureActionState, FormData>(
    generateFixtures.bind(null, tournamentId),
    undefined,
  );

  return (
    <div className="flex flex-col items-end gap-2">
      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          {state.success}
        </p>
      )}
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          {pending ? "Starting..." : "Start tournament"}
        </button>
      </form>
      <p className="text-xs text-zinc-400">Generates fixtures, standings, and the bracket.</p>
    </div>
  );
}
