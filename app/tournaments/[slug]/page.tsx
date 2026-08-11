import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus, RoundType, TournamentFormat, TournamentStatus } from "@/lib/generated/prisma";
import { JoinTournamentForm, RegistrationDecision, AddPlayersForm, RemovePlayerButton, DeleteTournamentButton } from "@/components/tournament-forms";
import { GenerateFixturesButton } from "@/components/generate-fixtures-button";
import { SubmitResultForm, ConfirmButtons, OverrideResultForm, WalkoverButtons } from "@/components/match-result-forms";
import { BracketView } from "@/components/bracket-view";
import { StatusBadge } from "@/components/status-badge";
import { getGroupStandings, getSwissStandings } from "@/lib/services/standings";
import { nextPowerOfTwo } from "@/lib/services/fixtures";
import type { StandingRow } from "@/lib/fixtures";

export default async function TournamentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: {
      organizer: { select: { id: true, name: true } },
      registrations: {
        include: { player: { select: { id: true, name: true, eFootballGamertag: true } } },
        orderBy: { seed: "asc" },
      },
    },
  });
  if (!tournament) notFound();

  const session = await auth();
  const isOrganizer = session?.user?.id === tournament.organizer.id;
  const myRegistration = session?.user
    ? tournament.registrations.find((r) => r.playerId === session.user.id)
    : undefined;
  const approvedCount = tournament.registrations.filter((r) => r.status === RegistrationStatus.APPROVED).length;
  const pendingRegistrations = tournament.registrations.filter((r) => r.status === RegistrationStatus.PENDING);

  const matches = await prisma.match.findMany({
    where: { tournamentId: tournament.id },
    include: {
      homeRegistration: { include: { player: { select: { id: true, name: true } } } },
      awayRegistration: { include: { player: { select: { id: true, name: true } } } },
      group: { select: { name: true } },
    },
    orderBy: [{ roundNumber: "asc" }, { bracketPosition: "asc" }],
  });

  const groups = await prisma.group.findMany({
    where: { tournamentId: tournament.id },
    orderBy: { sortOrder: "asc" },
    include: { participants: { include: { registration: { include: { player: { select: { name: true } } } } } } },
  });

  const champion = await prisma.trophy.findFirst({
    where: { tournamentId: tournament.id },
    include: { player: { select: { name: true, eFootballGamertag: true } } },
    orderBy: { awardedAt: "asc" },
  });

  const groupStandings = new Map<string, StandingRow[]>();
  for (const g of groups) {
    groupStandings.set(g.id, await getGroupStandings(tournament, g.id));
  }
  const swissStandings =
    tournament.format === TournamentFormat.SWISS
      ? await getSwissStandings(tournament, Math.max(...matches.filter((m) => m.roundType === RoundType.SWISS).map((m) => m.roundNumber), 1))
      : null;

  const knockoutMatches = matches.filter((m) => m.roundType === RoundType.KNOCKOUT && m.bracketType === null);
  let bracketRounds = 0;
  if (tournament.format === TournamentFormat.GROUP_KNOCKOUT) {
    const qpg = (tournament.groupConfig as { qualifiersPerGroup?: number } | null)?.qualifiersPerGroup ?? 2;
    const groupsCount = groups.length;
    bracketRounds = groupsCount > 0 ? Math.log2(nextPowerOfTwo(groupsCount * qpg)) : 0;
  } else if (tournament.format === TournamentFormat.SINGLE_ELIMINATION) {
    const approved = tournament.registrations.filter((r) => r.status === RegistrationStatus.APPROVED).length;
    bracketRounds = approved > 0 ? Math.log2(nextPowerOfTwo(approved)) : 0;
  }

  const hasFixtures = matches.length > 0;
  const canEditRoster =
    isOrganizer &&
    !hasFixtures &&
    (tournament.status === TournamentStatus.OPEN || tournament.status === TournamentStatus.APPROVAL);

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
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/70 via-zinc-900/50 to-zinc-900/80" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8">
      <p className="mb-2 text-sm text-zinc-300">
        <Link href="/tournaments" className="hover:underline">
          Tournaments
        </Link>{" "}
        / {tournament.name}
      </p>

      {champion && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 p-6 text-center dark:border-amber-800 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-950/40">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Tournament complete
          </p>
          <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-50">
            {champion.player.name}
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {champion.player.eFootballGamertag
              ? `eFootball: ${champion.player.eFootballGamertag}`
              : "Winner"}{" "}
            is the champion
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white drop-shadow-md">{tournament.name}</h1>
            <StatusBadge status={tournament.status} />
          </div>
          <p className="mt-2 max-w-2xl text-zinc-200">
            {tournament.description ?? "No description."}
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-300">
            <span>{tournament.format.replace(/_/g, " ")}</span>
            <span>
              {approvedCount}
              {tournament.maxPlayers ? ` / ${tournament.maxPlayers}` : ""} players
            </span>
            <span>Organized by {tournament.organizer.name}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {!session?.user && (
            <Link href="/login" className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300">
              Sign in to join
            </Link>
          )}

          {session?.user && !myRegistration && !isOrganizer && tournament.status === TournamentStatus.OPEN && (
            <JoinTournamentForm tournamentId={tournament.id} />
          )}

          {isOrganizer && (tournament.status === TournamentStatus.OPEN || tournament.status === TournamentStatus.APPROVAL) && (
            <GenerateFixturesButton tournamentId={tournament.id} />
          )}

          {isOrganizer && <DeleteTournamentButton tournamentId={tournament.id} />}

          {myRegistration && (
            <span className="rounded-md border border-white/30 px-4 py-2 text-sm text-zinc-100">
              Your registration: {myRegistration.status}
            </span>
          )}
        </div>
      </div>

      {tournament.rules && (
        <section className="mb-6 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-2 font-semibold">Rules</h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{tournament.rules}</p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 font-semibold">Players ({approvedCount})</h2>
          {canEditRoster && (
            <AddPlayersForm
              tournamentId={tournament.id}
              approvedCount={approvedCount}
              maxPlayers={tournament.maxPlayers}
            />
          )}
          {tournament.registrations.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {canEditRoster
                ? "Enter the players above to get started."
                : "No players registered yet."}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {tournament.registrations.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <PlayerLink player={r.player} gamertag={r.player.eFootballGamertag ?? undefined} />
                    <p className="text-xs text-zinc-500">{r.status}</p>
                  </div>
                  {isOrganizer && !hasFixtures && r.status === RegistrationStatus.PENDING && (
                    <RegistrationDecision registrationId={r.id} />
                  )}
                  {canEditRoster && r.status === RegistrationStatus.APPROVED && (
                    <RemovePlayerButton registrationId={r.id} />
                  )}
                </li>
              ))}
            </ul>
          )}
          {pendingRegistrations.length > 0 && isOrganizer && !hasFixtures && (
            <p className="mt-3 text-xs text-zinc-500">{pendingRegistrations.length} pending approval</p>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 font-semibold">Fixtures ({matches.length})</h2>
          {matches.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {isOrganizer
                ? "Add players to generate fixtures, standings, and the bracket automatically."
                : "Fixtures will be generated here once the tournament starts."}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {matches.map((m) => {
                const isParticipant =
                  !!myRegistration &&
                  (m.homeRegistrationId === myRegistration.id || m.awayRegistrationId === myRegistration.id);
                const isReporter = m.reportedById === session?.user?.id;
                const needsShootout = m.roundType === RoundType.KNOCKOUT;
                const decided = m.status === "CONFIRMED" || m.status === "WALKOVER";

                return (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="w-10 shrink-0 text-xs text-zinc-400">
                      {m.group ? `${m.group.name.replace("Group ", "G")} ` : ""}R{m.roundNumber}
                    </span>
                    <span className="flex flex-1 items-center gap-2">
                      {m.homeRegistration ? (
                        <PlayerLink player={m.homeRegistration.player} />
                      ) : (
                        <span className="font-medium">TBD</span>
                      )}
                      <span className="text-zinc-400">vs</span>
                      {m.awayRegistration ? (
                        <PlayerLink player={m.awayRegistration.player} />
                      ) : (
                        <span className="font-medium">TBD</span>
                      )}
                    </span>
                    <span className="flex items-center gap-3">
                      {decided && (
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          {m.homeScore}–{m.awayScore}
                          {m.homeShootout != null && (
                            <span className="text-zinc-400"> ({m.homeShootout}–{m.awayShootout} pens)</span>
                          )}
                          {m.status === "WALKOVER" && <span className="ml-1 text-amber-600">W/O</span>}
                        </span>
                      )}
                      {!decided && (
                        <span className="text-xs text-zinc-400">
                          {m.status === "DISPUTED" ? (
                            <span className="text-amber-600">Disputed</span>
                          ) : m.status === "PENDING_CONFIRM" ? (
                            isReporter ? "Awaiting confirmation" : "Pending confirmation"
                          ) : (
                            m.status
                          )}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      {m.status === "SCHEDULED" && (isParticipant || isOrganizer) && (
                        <>
                          <SubmitResultForm matchId={m.id} needsShootout={needsShootout} />
                          {isOrganizer && <WalkoverButtons matchId={m.id} />}
                        </>
                      )}
                      {m.status === "PENDING_CONFIRM" && ((isParticipant && !isReporter) || isOrganizer) && (
                        <>
                          <ConfirmButtons matchId={m.id} />
                          {isOrganizer && <OverrideResultForm matchId={m.id} needsShootout={needsShootout} />}
                        </>
                      )}
                      {m.status === "DISPUTED" && isOrganizer && (
                        <OverrideResultForm matchId={m.id} needsShootout={needsShootout} />
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 font-semibold">Standings</h2>
          {tournament.format === TournamentFormat.GROUP_KNOCKOUT && groups.length === 0 && (
            <p className="text-sm text-zinc-500">Standings will appear once the group stage starts.</p>
          )}
          {tournament.format === TournamentFormat.SWISS && swissStandings && (
            <StandingsTable rows={swissStandings} nameOf={(id) => nameOfRegistration(tournament.registrations, id)} />
          )}
          {(tournament.format === TournamentFormat.SINGLE_ELIMINATION || tournament.format === TournamentFormat.DOUBLE_ELIMINATION) && (
            <p className="text-sm text-zinc-500">Knockout formats use the bracket instead of standings.</p>
          )}
          {tournament.format === TournamentFormat.GROUP_KNOCKOUT &&
            groups.map((g) => (
              <div key={g.id} className={groups.length > 1 ? "mb-5 last:mb-0" : ""}>
                <h3 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">{g.name}</h3>
                <StandingsTable
                  rows={groupStandings.get(g.id) ?? []}
                  nameOf={(id) => nameOfRegistration(tournament.registrations, id)}
                />
              </div>
            ))}
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 font-semibold">Bracket</h2>
          <BracketView matches={knockoutMatches} totalRounds={bracketRounds} />
        </section>
      </div>
      </div>
    </main>
  );
}

function PlayerLink({ player, gamertag }: { player: { id: string; name: string }; gamertag?: string }) {
  return (
    <p className="text-sm font-medium">
      <Link href={`/players/${player.id}`} className="hover:underline">
        {player.name}
      </Link>
      {gamertag && <span className="ml-2 text-xs text-zinc-400">{gamertag}</span>}
    </p>
  );
}

function nameOfRegistration(
  registrations: { id: string; player: { id: string; name: string } }[],
  id: string,
): { name: string; playerId: string } | null {
  const r = registrations.find((r) => r.id === id);
  return r ? { name: r.player.name, playerId: r.player.id } : null;
}

function StandingsTable({
  rows,
  nameOf,
}: {
  rows: StandingRow[];
  nameOf: (id: string) => { name: string; playerId: string } | null;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No matches played yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-400 dark:border-zinc-800">
          <th className="py-1 pr-2 font-normal">#</th>
          <th className="py-1 pr-2 font-normal">Player</th>
          <th className="py-1 pr-2 text-center font-normal">P</th>
          <th className="py-1 pr-2 text-center font-normal">W</th>
          <th className="py-1 pr-2 text-center font-normal">D</th>
          <th className="py-1 pr-2 text-center font-normal">L</th>
          <th className="py-1 pr-2 text-center font-normal">GD</th>
          <th className="py-1 text-center font-normal">Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const player = nameOf(row.participantId);
          return (
            <tr key={row.participantId} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/50">
              <td className="py-1.5 pr-2 text-zinc-400">{i + 1}</td>
              <td className="py-1.5 pr-2 font-medium">
                {player ? (
                  <Link href={`/players/${player.playerId}`} className="hover:underline">
                    {player.name}
                  </Link>
                ) : (
                  "Unknown"
                )}
              </td>
              <td className="py-1.5 pr-2 text-center text-zinc-500">{row.played}</td>
              <td className="py-1.5 pr-2 text-center text-zinc-500">{row.won}</td>
              <td className="py-1.5 pr-2 text-center text-zinc-500">{row.drawn}</td>
              <td className="py-1.5 pr-2 text-center text-zinc-500">{row.lost}</td>
              <td className="py-1.5 pr-2 text-center text-zinc-500">{row.goalDiff}</td>
              <td className="py-1.5 text-center font-semibold">{row.points}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
