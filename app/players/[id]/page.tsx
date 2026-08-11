import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPlayerStats, getPlayerHistory } from "@/lib/services/statistics";

const PLATFORM_LABELS: Record<string, string> = {
  PS: "PlayStation",
  XBOX: "Xbox",
  PC: "PC",
  MOBILE: "Mobile",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 text-center dark:border-zinc-800">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400">{label}</p>
    </div>
  );
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      eFootballGamertag: true,
      eFootballPlatform: true,
      eFootballPlayerId: true,
      createdAt: true,
    },
  });
  if (!player) notFound();

  const [stats, history] = await Promise.all([getPlayerStats(id), getPlayerHistory(id)]);
  const goalDiff = stats.goalsFor - stats.goalsAgainst;
  const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{player.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {player.eFootballGamertag ? (
              <>
                eFootball: <span className="font-medium">{player.eFootballGamertag}</span>
                {player.eFootballPlatform ? ` · ${PLATFORM_LABELS[player.eFootballPlatform] ?? player.eFootballPlatform}` : ""}
              </>
            ) : (
              "No eFootball identity linked"
            )}
          </p>
        </div>
        <p className="text-xs text-zinc-400">Member since {player.createdAt.toLocaleDateString()}</p>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Played" value={stats.played} />
        <StatCard label="Won" value={stats.won} />
        <StatCard label="Drawn" value={stats.drawn} />
        <StatCard label="Lost" value={stats.lost} />
        <StatCard label="Goals" value={stats.goalsFor} />
        <StatCard label="Against" value={stats.goalsAgainst} />
        <StatCard label="Goal diff" value={goalDiff > 0 ? `+${goalDiff}` : goalDiff} />
        <StatCard label="Win rate" value={`${winRate}%`} />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 text-center dark:border-amber-900 dark:from-amber-950/40 dark:to-yellow-950/30">
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{stats.championships}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-amber-600/80 dark:text-amber-400/80">
            Championships
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-3 font-semibold">Tournament history ({history.length})</h2>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">No tournaments joined yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {history.map((entry) => (
              <li key={entry.registrationId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <Link
                    href={`/tournaments/${entry.tournamentSlug}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {entry.tournamentName}
                  </Link>
                  <span className="text-xs text-zinc-400">
                    {entry.format} · {entry.status.replace(/_/g, " ")}
                  </span>
                </div>
                {entry.isChampion ? (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    1st
                  </span>
                ) : entry.status === "COMPLETED" ? (
                  <span className="shrink-0 text-xs text-zinc-400">Played</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
