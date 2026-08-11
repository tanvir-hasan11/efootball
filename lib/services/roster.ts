import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus, Role } from "@/lib/generated/prisma";
import { generateFixturesForTournament } from "./fixtures";
import { notifyTournamentPlayers } from "./notifications";

export type AddPlayersResult = {
  added: number;
  linked: number;
  skipped: number;
  started: boolean;
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "player"
  );
}

/**
 * Adds players to a tournament roster on behalf of the organizer. Names are
 * matched against existing accounts case-insensitively; matching accounts are
 * linked, unknown names get a placeholder account so their profile, fixtures,
 * and trophies can be tracked. Registrations are created as approved and
 * seeded in order.
 *
 * When the roster reaches capacity (maxPlayers, or 2+ players when no cap is
 * set), fixtures, standings, and the bracket are generated automatically and
 * the tournament moves to ACTIVE.
 *
 * The caller is responsible for authorization (organizer) and for ensuring the
 * tournament has not generated fixtures yet.
 */
export async function addPlayersToTournament(
  tournamentId: string,
  names: string[],
): Promise<AddPlayersResult> {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new Error("Tournament not found.");

  const registrations = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    include: { player: { select: { id: true, name: true } } },
  });
  const registeredIds = new Set(registrations.map((r) => r.playerId));

  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
  const userByNormalizedName = new Map<string, string>();
  for (const u of allUsers) {
    const key = u.name.trim().toLowerCase();
    if (!userByNormalizedName.has(key)) userByNormalizedName.set(key, u.id);
  }

  let added = 0;
  let linked = 0;
  let skipped = 0;
  let seed = Math.max(0, ...registrations.map((r) => r.seed ?? 0));

  for (const name of names) {
    const key = name.toLowerCase();
    let userId = userByNormalizedName.get(key);

    if (userId && registeredIds.has(userId)) {
      skipped++;
      continue;
    }

    if (!userId) {
      const email = `${slugify(name)}-${randomBytes(3).toString("hex")}@players.local`;
      const created = await prisma.user.create({
        data: {
          email,
          name,
          role: Role.PLAYER,
          passwordHash: await bcrypt.hash(randomBytes(16).toString("hex"), 10),
        },
      });
      userId = created.id;
      userByNormalizedName.set(key, userId);
      added++;
    } else {
      linked++;
    }

    await prisma.tournamentPlayer.create({
      data: { tournamentId, playerId: userId, status: RegistrationStatus.APPROVED, seed: ++seed },
    });
    registeredIds.add(userId);
  }

  const approvedCount = await prisma.tournamentPlayer.count({
    where: { tournamentId, status: RegistrationStatus.APPROVED },
  });
  const ready = tournament.maxPlayers ? approvedCount >= tournament.maxPlayers : approvedCount >= 2;

  let started = false;
  if (ready) {
    await generateFixturesForTournament(tournamentId);
    await notifyTournamentPlayers(
      tournamentId,
      "Fixtures generated",
      `The tournament ${tournament.name} has started. Check your fixtures.`,
    );
    started = true;
  }

  return { added, linked, skipped, started };
}

/**
 * Removes a player's registration. The caller must verify the organizer and
 * that fixtures have not been generated yet.
 */
export async function removePlayerFromTournament(registrationId: string): Promise<string> {
  const registration = await prisma.tournamentPlayer.findUnique({
    where: { id: registrationId },
    select: { playerId: true },
  });
  if (!registration) throw new Error("Registration not found.");

  const player = await prisma.user.findUnique({
    where: { id: registration.playerId },
    select: { name: true },
  });
  await prisma.tournamentPlayer.delete({ where: { id: registrationId } });
  return player?.name ?? "Player";
}
