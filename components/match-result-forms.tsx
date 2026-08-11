"use client";

import { useActionState } from "react";
import {
  submitResult,
  confirmResult,
  disputeResult,
  overrideResult,
  markWalkover,
  type ResultActionState,
} from "@/lib/actions/results";

function Message({ state }: { state: ResultActionState }) {
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

type ScoreFormProps = {
  matchId: string;
  needsShootout: boolean;
};

function ScoreFields({ needsShootout }: { needsShootout: boolean }) {
  return (
    <>
      <div className="flex items-center gap-1">
        <input
          name="homeScore"
          type="number"
          min={0}
          max={99}
          required
          placeholder="H"
          className="w-14 rounded border border-zinc-300 px-2 py-1 text-center text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="text-zinc-400">–</span>
        <input
          name="awayScore"
          type="number"
          min={0}
          max={99}
          required
          placeholder="A"
          className="w-14 rounded border border-zinc-300 px-2 py-1 text-center text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {needsShootout && (
        <div className="flex items-center gap-1">
          <input
            name="homeShootout"
            type="number"
            min={0}
            max={99}
            placeholder="Pen H"
            className="w-16 rounded border border-zinc-300 px-2 py-1 text-center text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="text-zinc-400">–</span>
          <input
            name="awayShootout"
            type="number"
            min={0}
            max={99}
            placeholder="Pen A"
            className="w-16 rounded border border-zinc-300 px-2 py-1 text-center text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      )}
    </>
  );
}

export function SubmitResultForm({ matchId, needsShootout }: ScoreFormProps) {
  const [state, formAction, pending] = useActionState<ResultActionState, FormData>(
    submitResult.bind(null, matchId),
    undefined,
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Message state={state} />
      <form action={formAction} className="flex items-center gap-2">
        <ScoreFields needsShootout={needsShootout} />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "..." : "Submit"}
        </button>
      </form>
    </div>
  );
}

export function ConfirmButtons({ matchId }: { matchId: string }) {
  const [state, confirmAction, confirming] = useActionState<ResultActionState, FormData>(
    confirmResult.bind(null, matchId),
    undefined,
  );
  const [, disputeAction, disputing] = useActionState<ResultActionState, FormData>(
    disputeResult.bind(null, matchId),
    undefined,
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Message state={state} />
      <div className="flex gap-2">
        <form action={confirmAction}>
          <button
            type="submit"
            disabled={confirming}
            className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-500 disabled:opacity-50"
          >
            {confirming ? "..." : "Confirm"}
          </button>
        </form>
        <form action={disputeAction}>
          <button
            type="submit"
            disabled={disputing}
            className="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {disputing ? "..." : "Dispute"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function OverrideResultForm({ matchId, needsShootout }: ScoreFormProps) {
  const [state, formAction, pending] = useActionState<ResultActionState, FormData>(
    overrideResult.bind(null, matchId),
    undefined,
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Message state={state} />
      <form action={formAction} className="flex items-center gap-2">
        <ScoreFields needsShootout={needsShootout} />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {pending ? "..." : "Override"}
        </button>
      </form>
    </div>
  );
}

export function WalkoverButtons({ matchId }: { matchId: string }) {
  const [homeState, homeAction, pendingHome] = useActionState<ResultActionState, FormData>(
    markWalkover.bind(null, matchId, "HOME"),
    undefined,
  );
  const [awayState, awayAction, pendingAway] = useActionState<ResultActionState, FormData>(
    markWalkover.bind(null, matchId, "AWAY"),
    undefined,
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Message state={homeState} />
      <Message state={awayState} />
      <div className="flex gap-2">
        <form action={homeAction}>
          <button
            type="submit"
            disabled={pendingHome}
            className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Walkover home
          </button>
        </form>
        <form action={awayAction}>
          <button
            type="submit"
            disabled={pendingAway}
            className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Walkover away
          </button>
        </form>
      </div>
    </div>
  );
}
