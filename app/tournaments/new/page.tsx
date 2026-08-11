"use client";

import { useActionState } from "react";
import { createTournament, type TournamentActionState } from "@/lib/actions/tournaments";

const formats = [
  { value: "GROUP_KNOCKOUT", label: "Group stage → Knockout", description: "Groups into Round of 32 bracket" },
  { value: "SINGLE_ELIMINATION", label: "Single elimination", description: "Straight knockout bracket" },
  { value: "DOUBLE_ELIMINATION", label: "Double elimination", description: "Winner + loser brackets" },
  { value: "SWISS", label: "Swiss system", description: "Pair by record each round" },
];

export default function NewTournamentPage() {
  const [state, formAction, pending] = useActionState<TournamentActionState, FormData>(createTournament, undefined);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Create tournament</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Set the rules, format, and structure. After creating it, add the players and the
        tournament starts automatically.
      </p>

      {state?.error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Tournament name
          <input
            name="name"
            required
            minLength={3}
            placeholder="e.g. Summer Champions League"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            name="description"
            rows={3}
            placeholder="What makes this tournament special?"
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Rules
          <textarea
            name="rules"
            rows={3}
            placeholder="Format rules, walkover policy, match settings..."
            className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-medium">Format</legend>
          {formats.map((f) => (
            <label
              key={f.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-2.5 has-[:checked]:border-zinc-800 has-[:checked]:bg-zinc-50 dark:border-zinc-800 dark:has-[:checked]:border-zinc-200 dark:has-[:checked]:bg-zinc-900"
            >
              <input type="radio" name="format" value={f.value} defaultChecked={f.value === "GROUP_KNOCKOUT"} />
              <span>
                <span className="font-medium">{f.label}</span>
                <span className="block text-xs text-zinc-500">{f.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Max players
            <input
              name="maxPlayers"
              type="number"
              min={2}
              max={512}
              defaultValue={32}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Match deadline (days)
            <input
              name="matchDeadlineDays"
              type="number"
              min={1}
              max={60}
              defaultValue={7}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>

        <div className="grid gap-4 rounded-md border border-zinc-200 p-4 sm:grid-cols-2 dark:border-zinc-800">
          <label className="flex flex-col gap-1 text-sm">
            Group size
            <input
              name="groupSize"
              type="number"
              min={2}
              max={16}
              defaultValue={4}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Qualifiers per group
            <input
              name="qualifiersPerGroup"
              type="number"
              min={1}
              defaultValue={2}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="thirdPlaceMatch" defaultChecked />
          Play a third-place match in the knockout stage
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          {pending ? "Creating..." : "Create tournament"}
        </button>
      </form>
    </main>
  );
}
