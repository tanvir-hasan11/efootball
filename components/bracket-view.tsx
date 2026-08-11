import Link from "next/link";
import { BracketType, MatchStatus, RoundType } from "@/lib/generated/prisma";

type BracketMatch = {
  id: string;
  roundType: RoundType;
  roundNumber: number;
  bracketType: BracketType | null;
  bracketPosition: number | null;
  homeRegistrationId: string | null;
  awayRegistrationId: string | null;
  homeRegistration: { player: { id: string; name: string } } | null;
  awayRegistration: { player: { id: string; name: string } } | null;
  homeScore: number | null;
  awayScore: number | null;
  homeShootout: number | null;
  awayShootout: number | null;
  winnerId: string | null;
  status: MatchStatus;
};

const STAGE_NAMES = ["Final", "Semi-finals", "Quarter-finals", "Round of 16", "Round of 32"];

function stageName(round: number, totalRounds: number): string {
  const fromFinal = totalRounds - round;
  return STAGE_NAMES[fromFinal] ?? `Round ${round}`;
}

function Score({ m }: { m: BracketMatch }) {
  if (m.status !== MatchStatus.CONFIRMED && m.status !== MatchStatus.WALKOVER) {
    return <span className="text-xs text-zinc-400">{m.status === MatchStatus.PENDING_CONFIRM ? "Pending" : m.status}</span>;
  }
  const shootout =
    m.homeShootout != null && m.awayShootout != null ? ` (${m.homeShootout}–${m.awayShootout})` : "";
  return (
    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
      {m.homeScore}–{m.awayScore}
      {shootout}
      {m.status === MatchStatus.WALKOVER && <span className="ml-1 text-amber-600">W/O</span>}
    </span>
  );
}

function Player({
  playerId,
  name,
  isWinner,
}: {
  playerId: string | null;
  name: string;
  isWinner: boolean;
}) {
  const className = isWinner ? "font-semibold text-zinc-900 dark:text-zinc-50" : "text-zinc-500";
  if (!playerId) {
    return <span className={className}>{name}</span>;
  }
  return (
    <Link href={`/players/${playerId}`} className={`${className} hover:underline`}>
      {name}
    </Link>
  );
}

function MatchCard({ m }: { m: BracketMatch }) {
  const homeWinner = m.winnerId != null && m.winnerId === m.homeRegistrationId;
  const awayWinner = m.winnerId != null && m.winnerId === m.awayRegistrationId;
  return (
    <div className="w-40 rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <Player playerId={m.homeRegistration?.player.id ?? null} name={m.homeRegistration?.player.name ?? "TBD"} isWinner={homeWinner} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Player playerId={m.awayRegistration?.player.id ?? null} name={m.awayRegistration?.player.name ?? "TBD"} isWinner={awayWinner} />
      </div>
      <div className="mt-1 border-t border-zinc-100 pt-1 text-right dark:border-zinc-800">
        <Score m={m} />
      </div>
    </div>
  );
}

function RoundColumn({
  title,
  matches,
}: {
  title: string;
  matches: BracketMatch[];
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      {matches.map((m) => (
        <MatchCard key={m.id} m={m} />
      ))}
    </div>
  );
}

export function BracketView({ matches, totalRounds }: { matches: BracketMatch[]; totalRounds: number }) {
  const knockout = matches.filter((m) => m.roundType === RoundType.KNOCKOUT && m.bracketType === null);
  const doubleElim = matches.filter((m) => m.bracketType !== null);

  if (doubleElim.length > 0) {
    const winners = doubleElim.filter((m) => m.bracketType === BracketType.WINNERS);
    const losers = doubleElim.filter((m) => m.bracketType === BracketType.LOSERS);
    const grand = doubleElim.filter((m) => m.bracketType === BracketType.GRAND);
    const maxWb = Math.max(...winners.map((m) => m.roundNumber), 1);
    return (
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Winners bracket</h3>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: maxWb }, (_, i) => i + 1).map((r) => (
              <RoundColumn
                key={r}
                title={stageName(r, maxWb)}
                matches={winners.filter((m) => m.roundNumber === r)}
              />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Losers bracket</h3>
          <div className="flex flex-wrap gap-4">
            {[...new Set(losers.map((m) => m.roundNumber))].sort((a, b) => a - b).map((r) => (
              <RoundColumn key={r} title={`Losers R${r}`} matches={losers.filter((m) => m.roundNumber === r)} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Grand final</h3>
          <div className="flex flex-wrap gap-4">
            <RoundColumn title="Final" matches={grand} />
          </div>
        </div>
      </div>
    );
  }

  if (knockout.length === 0) {
    return <p className="text-sm text-zinc-500">The knockout bracket will appear here.</p>;
  }

  const thirdPlace = knockout.filter((m) => m.roundNumber > totalRounds);

  return (
    <div>
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
          <RoundColumn
            key={r}
            title={stageName(r, totalRounds)}
            matches={knockout.filter((m) => m.roundNumber === r)}
          />
        ))}
      </div>
      {thirdPlace.length > 0 && (
        <div className="mt-6">
          <RoundColumn title="3rd place" matches={thirdPlace} />
        </div>
      )}
    </div>
  );
}
