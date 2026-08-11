import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function TrophiesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const trophies = await prisma.trophy.findMany({
    where: { playerId: session.user.id },
    include: { tournament: { select: { name: true, slug: true } } },
    orderBy: { awardedAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Trophy cabinet</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {trophies.length === 1
          ? "1 championship won"
          : `${trophies.length} championships won`}
      </p>

      {trophies.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">
          You have not won any tournaments yet.{" "}
          <Link href="/tournaments" className="underline">
            Join a tournament
          </Link>{" "}
          and go for glory.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {trophies.map((trophy) => (
            <li
              key={trophy.id}
              className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 dark:border-amber-900 dark:from-amber-950/40 dark:to-yellow-950/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Champion
                  </p>
                  <Link
                    href={`/tournaments/${trophy.tournament.slug}`}
                    className="mt-1 block font-semibold hover:underline"
                  >
                    {trophy.tournament.name}
                  </Link>
                </div>
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-400/20 text-sm font-black text-amber-600 dark:text-amber-400"
                  aria-hidden
                >
                  1st
                </span>
              </div>
              <p className="mt-3 text-xs text-zinc-400">{trophy.awardedAt.toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
