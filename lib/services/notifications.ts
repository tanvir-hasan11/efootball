import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/lib/generated/prisma";

export async function createNotification(userId: string, title: string, body?: string): Promise<void> {
  await prisma.notification.create({ data: { userId, title, body: body ?? null } });
}

/**
 * Notifies every approved player in a tournament (organizer is included via
 * their own registrations if applicable).
 */
export async function notifyTournamentPlayers(tournamentId: string, title: string, body?: string): Promise<void> {
  const players = await prisma.tournamentPlayer.findMany({
    where: { tournamentId, status: RegistrationStatus.APPROVED },
    select: { playerId: true },
  });
  if (players.length === 0) return;
  await prisma.notification.createMany({
    data: players.map((p) => ({ userId: p.playerId, title, body: body ?? null })),
  });
}

export async function markNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
