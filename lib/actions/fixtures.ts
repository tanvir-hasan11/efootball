"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateFixturesForTournament } from "@/lib/services/fixtures";
import { TournamentStatus } from "@/lib/generated/prisma";
import { notifyTournamentPlayers } from "@/lib/services/notifications";

export type FixtureActionState = { error?: string; success?: string } | undefined;

export async function generateFixtures(tournamentId: string): Promise<FixtureActionState> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return { error: "Tournament not found." };
  if (tournament.organizerId !== session.user.id) {
    return { error: "Only the organizer can generate fixtures." };
  }
  if (tournament.status !== TournamentStatus.OPEN && tournament.status !== TournamentStatus.APPROVAL) {
    return { error: "Fixtures can only be generated before the tournament starts." };
  }

  const existing = await prisma.match.count({ where: { tournamentId } });
  if (existing > 0) {
    return { error: "Fixtures have already been generated." };
  }

  try {
    await generateFixturesForTournament(tournamentId);
    await notifyTournamentPlayers(
      tournamentId,
      "Fixtures generated",
      `The tournament ${tournament.name} has started. Check your fixtures.`,
    );
  } catch (e) {
    console.error(e);
    return { error: "Failed to generate fixtures. Please try again." };
  }

  revalidatePath(`/tournaments/${tournament.slug}`);
  return { success: "Fixtures generated. The tournament is now active." };
}
