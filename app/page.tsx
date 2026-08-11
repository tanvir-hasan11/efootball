import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { _count: { select: { registrations: true } } },
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
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/60 via-zinc-900/30 to-zinc-900/70" />

      <div className="relative z-10">
        <section className="flex min-h-[70vh] items-center justify-center px-4 py-20 text-center">
          <div className="w-full max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl">
              eFootball League Platform
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-zinc-100 drop-shadow-md">
              Create tournaments, generate fixtures, record results, and crown
              a champion. Built for the eFootball community.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                href="/register"
                className="rounded-md bg-white px-5 py-2.5 font-medium text-zinc-900 hover:bg-zinc-200"
              >
                Create your account
              </Link>
              <Link
                href="/tournaments"
                className="rounded-md border border-white/70 px-5 py-2.5 font-medium text-white hover:bg-white/10"
              >
                Browse tournaments
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-10">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur-sm sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Latest tournaments
              </h2>
              <Link href="/tournaments" className="text-sm text-white/70 hover:underline">
                View all
              </Link>
            </div>
            {tournaments.length === 0 ? (
              <p className="text-zinc-300">No tournaments yet.</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tournaments/${t.slug}`}
                      className="block rounded-lg border border-white/10 bg-white/5 p-5 transition hover:border-white/30 hover:bg-white/10"
                    >
                      <h3 className="font-semibold text-white">{t.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-200">
                        {t.description ?? "No description"}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs text-zinc-300">
                        <span>{t.format.replace(/_/g, " ")}</span>
                        <span>{t._count.registrations} players</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}