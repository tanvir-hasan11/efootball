"use client";

import { useActionState } from "react";
import {
  addPlayers,
  deleteTournament,
  joinTournament,
  removePlayer,
  setRegistrationStatus,
  type TournamentActionState,
} from "@/lib/actions/tournaments";

function Message({ state }: { state: TournamentActionState }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
        {state.success}
      </p>
    );
  }
  return null;
}

export function JoinTournamentForm({ tournamentId }: { tournamentId: string }) {
  const [state, formAction, pending] = useActionState<TournamentActionState, FormData>(
    joinTournament.bind(null, tournamentId),
    undefined,
  );

  return (
    <div className="flex flex-col items-end gap-2">
      <Message state={state} />
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          {pending ? "Joining..." : "Join tournament"}
        </button>
      </form>
    </div>
  );
}

export function RegistrationDecision({ registrationId }: { registrationId: string }) {
  const [state, formAction, pending] = useActionState<TournamentActionState, FormData>(
    setRegistrationStatus.bind(null, registrationId, "APPROVED"),
    undefined,
  );
  const [, rejectAction, rejecting] = useActionState<TournamentActionState, FormData>(
    setRegistrationStatus.bind(null, registrationId, "REJECTED"),
    undefined,
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Message state={state} />
      <div className="flex gap-2">
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-500 disabled:opacity-50"
          >
            {pending ? "..." : "Approve"}
          </button>
        </form>
        <form action={rejectAction}>
          <button
            type="submit"
            disabled={rejecting}
            className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-500 disabled:opacity-50"
          >
            {rejecting ? "..." : "Reject"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AddPlayersForm({
  tournamentId,
  approvedCount,
  maxPlayers,
}: {
  tournamentId: string;
  approvedCount: number;
  maxPlayers: number | null;
}) {
  const [state, formAction, pending] = useActionState<TournamentActionState, FormData>(
    addPlayers.bind(null, tournamentId),
    undefined,
  );

  return (
    <div className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-sm font-medium">Enter players</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        One name per line. Existing accounts are linked by name; new names get a placeholder
        account.
      </p>
      <Message state={state} />
      <form action={formAction} className="mt-2 flex flex-col gap-2">
        <textarea
          name="names"
          rows={5}
          placeholder={"Player 1\nPlayer 2\nPlayer 3"}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
        >
          {pending ? "Adding..." : "Add players"}
        </button>
      </form>
      <p className="mt-2 text-xs text-zinc-400">
        {approvedCount} player{approvedCount === 1 ? "" : "s"} entered
        {maxPlayers ? ` · ${maxPlayers} max` : ""}.
        {maxPlayers && approvedCount < maxPlayers
          ? ` A few more and fixtures are generated automatically.`
          : ""}
      </p>
    </div>
  );
}

export function RemovePlayerButton({ registrationId }: { registrationId: string }) {
  const [state, formAction, pending] = useActionState<TournamentActionState, FormData>(
    removePlayer.bind(null, registrationId),
    undefined,
  );

  return (
    <form action={formAction} title="Remove player">
      {state?.error && (
        <span className="mr-2 text-xs text-red-600 dark:text-red-400">{state.error}</span>
      )}
      {state?.success && (
        <span className="mr-2 text-xs text-green-600 dark:text-green-400">{state.success}</span>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-500 disabled:opacity-50"
      >
        {pending ? "..." : "Remove"}
      </button>
    </form>
  );
}

export function DeleteTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [state, formAction, pending] = useActionState<TournamentActionState, FormData>(
    deleteTournament,
    undefined,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Delete this tournament permanently? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="tournamentId" value={tournamentId} />
      {state?.error && (
        <span className="mr-2 text-xs text-red-600 dark:text-red-400">{state.error}</span>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        {pending ? "Deleting..." : "Delete tournament"}
      </button>
    </form>
  );
}
