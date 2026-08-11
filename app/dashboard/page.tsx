import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      _count: {
        select: {
          notifications: { where: { read: false } },
          trophies: true,
        },
      },
    },
  });
  if (!user) redirect("/login");

  const registrations = await prisma.tournamentPlayer.findMany({
    where: { playerId: user.id },
    include: { tournament: true },
    orderBy: { createdAt: "desc" },
  });

  const organized = await prisma.tournament.findMany({
    where: { organizerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { homeRegistration: { playerId: user.id } },
        { awayRegistration: { playerId: user.id } },
      ],
    },
    include: {
      tournament: true,
      homeRegistration: { include: { player: true } },
      awayRegistration: { include: { player: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const isOrganizer = user.role === Role.ORGANIZER || user.role === Role.BOTH;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name}</h1>
          <p className="text-sm text-zinc-500">
            {user.eFootballGamertag ? `eFootball: ${user.eFootballGamertag}` : "Link your eFootball identity on your profile."}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/trophies" className="rounded-md border border-amber-300 px-4 py-2 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40">
            {user._count.trophies} {user._count.trophies === 1 ? "trophy" : "trophies"}
          </Link>
          {user._count.notifications > 0 && (
            <Link
              href="/notifications"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
            >
              {user._count.notifications} new
            </Link>
          )}
          {isOrganizer && (
            <Link
              href="/tournaments/new"
              className="rounded-md bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
            >
              + Create tournament
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">My tournaments</h2>
            {user._count.notifications > 0 && (
              <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-black">
                {user._count.notifications} new
              </span>
            )}
          </div>
          {registrations.length === 0 && organized.length === 0 ? (
            <p className="text-sm text-zinc-500">
              You have not joined any tournaments yet.{" "}
              <Link href="/tournaments" className="underline">
                Browse tournaments
              </Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {registrations.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/tournaments/${r.tournament.slug}`}
                    className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2.5 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  >
                    <span className="text-sm font-medium">{r.tournament.name}</span>
                    <span className="text-xs text-zinc-500">{r.status}</span>
                  </Link>
                </li>
              ))}
              {organized.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tournaments/${t.slug}`}
                    className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2.5 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  >
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      Organizing
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-3 font-semibold">Recent matches</h2>
          {matches.length === 0 ? (
            <p className="text-sm text-zinc-500">No matches yet.</p>
          ) : (
            <ul className="space-y-3">
              {matches.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/tournaments/${m.tournament.slug}`}
                    className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2.5 text-sm hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {m.homeRegistration?.player.name ?? "TBD"} vs{" "}
                      {m.awayRegistration?.player.name ?? "TBD"}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {m.homeScore != null ? `${m.homeScore}–${m.awayScore}` : m.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
