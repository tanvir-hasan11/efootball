import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { DeleteTournamentButton } from "@/components/tournament-forms";

export default async function TournamentsPage() {
  const session = await auth();
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { registrations: true } },
      organizer: { select: { name: true } },
    },
  });

  return (
    <main className="relative flex-1">
      <Image
        src="/efootball-hero.jpg"
        alt="eFootball 2026"
        fill
        priority
        sizes="100vw"
        className="object-cover"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/70 via-zinc-900/40 to-zinc-900/80" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-white drop-shadow-md">
          Tournaments
        </h1>
        {tournaments.length === 0 ? (
          <p className="text-zinc-200">No tournaments yet. Check back soon.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <li
                key={t.id}
                className="flex flex-col justify-between rounded-lg border border-white/10 bg-zinc-950/70 backdrop-blur-sm transition hover:border-white/30"
              >
                <Link href={`/tournaments/${t.slug}`} className="block p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-white">{t.name}</h2>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-200">
                    {t.description ?? "No description"}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-300">
                    <span>{t.format.replace(/_/g, " ")}</span>
                    <span>
                      {t._count.registrations} players · by {t.organizer.name}
                    </span>
                  </div>
                </Link>
                {session?.user?.id === t.organizerId && (
                  <div className="flex items-center justify-end border-t border-white/10 px-4 py-2">
                    <DeleteTournamentButton tournamentId={t.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}