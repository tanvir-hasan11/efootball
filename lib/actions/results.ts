"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MatchStatus, RoundType } from "@/lib/generated/prisma";
import { handleMatchResolution } from "@/lib/services/advancement";
import { createNotification } from "@/lib/services/notifications";

export type ResultActionState = { error?: string; success?: string } | undefined;

async function notifyMatchUsers(
  match: {
    homeRegistration?: { playerId: string } | null;
    awayRegistration?: { playerId: string } | null;
    tournament: { name: string };
  },
  title: string,
  body?: string,
  exceptUserId?: string,
): Promise<void> {
  const userIds = [match.homeRegistration?.playerId, match.awayRegistration?.playerId].filter(
    (id): id is string => id != null && id !== exceptUserId,
  );
  for (const userId of userIds) {
    await createNotification(userId, title, body);
  }
}

const resultSchema = z.object({
  homeScore: z.coerce.number().int().min(0).max(99),
  awayScore: z.coerce.number().int().min(0).max(99),
  homeShootout: z.coerce.number().int().min(0).max(99).optional(),
  awayShootout: z.coerce.number().int().min(0).max(99).optional(),
});

async function loadMatchForPlayer(matchId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("You must be signed in.");

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: { select: { id: true, slug: true, name: true, organizerId: true } },
      homeRegistration: { select: { playerId: true } },
      awayRegistration: { select: { playerId: true } },
    },
  });
  if (!match) throw new Error("Match not found.");

  const isOrganizer = match.tournament.organizerId === session.user.id;
  const isHome = match.homeRegistration?.playerId === session.user.id;
  const isAway = match.awayRegistration?.playerId === session.user.id;

  return { session, match, isOrganizer, isHome, isAway };
}

function winnerOf(match: { roundType: RoundType; homeScore: number; awayScore: number; homeShootout?: number | null; awayShootout?: number | null }): {
  winner: "HOME" | "AWAY" | "DRAW";
  resolved: boolean;
} {
  if (match.homeScore > match.awayScore) return { winner: "HOME", resolved: true };
  if (match.homeScore < match.awayScore) return { winner: "AWAY", resolved: true };
  if (match.homeShootout != null && match.awayShootout != null) {
    if (match.homeShootout > match.awayShootout) return { winner: "HOME", resolved: true };
    if (match.homeShootout < match.awayShootout) return { winner: "AWAY", resolved: true };
  }
  return { winner: "DRAW", resolved: false };
}

export async function submitResult(matchId: string, _prev: ResultActionState, formData: FormData): Promise<ResultActionState> {
  const parsed = resultSchema.safeParse({
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    homeShootout: formData.get("homeShootout") || undefined,
    awayShootout: formData.get("awayShootout") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid score." };
  }

  const { session, match, isOrganizer, isHome, isAway } = await loadMatchForPlayer(matchId);
  if (!isHome && !isAway && !isOrganizer) {
    return { error: "Only the players in this match can submit a result." };
  }
  if (match.status !== MatchStatus.SCHEDULED && match.status !== MatchStatus.DISPUTED) {
    return { error: "This match already has a result." };
  }

  const { homeScore, awayScore, homeShootout, awayShootout } = parsed.data;

  const outcome = winnerOf({ roundType: match.roundType, homeScore, awayScore, homeShootout, awayShootout });
  if (match.roundType !== RoundType.GROUP && match.roundType !== RoundType.SWISS && !outcome.resolved) {
    return { error: "Knockout matches need a winner. Provide penalty shootout scores for a draw." };
  }

  const winnerId = outcome.resolved
    ? outcome.winner === "HOME"
      ? match.homeRegistrationId
      : match.awayRegistrationId
    : null;

  await prisma.match.update({
    where: { id: match.id },
    data: {
      homeScore,
      awayScore,
      homeShootout: homeShootout ?? null,
      awayShootout: awayShootout ?? null,
      winnerId,
      status: MatchStatus.PENDING_CONFIRM,
      reportedById: session.user.id,
    },
  });

  revalidatePath(`/tournaments/${match.tournament.slug}`);
  revalidatePath("/dashboard");
  await notifyMatchUsers(match, "Result awaiting confirmation", `Confirm or dispute the result in ${match.tournament.name}.`, session.user.id);
  return { success: "Result submitted. Waiting for your opponent to confirm." };
}

export async function confirmResult(matchId: string): Promise<ResultActionState> {
  const { session, match, isOrganizer, isHome, isAway } = await loadMatchForPlayer(matchId);
  if (!isHome && !isAway && !isOrganizer) {
    return { error: "Only the players in this match can confirm the result." };
  }
  if (match.status !== MatchStatus.PENDING_CONFIRM) {
    return { error: "There is no pending result to confirm." };
  }
  if (match.reportedById === session.user.id && !isOrganizer) {
    return { error: "The result must be confirmed by your opponent." };
  }

  await prisma.match.update({
    where: { id: match.id },
    data: {
      status: MatchStatus.CONFIRMED,
      confirmedById: session.user.id,
    },
  });

  await handleMatchResolution(match.id);

  revalidatePath(`/tournaments/${match.tournament.slug}`);
  revalidatePath("/dashboard");
  await notifyMatchUsers(match, "Result confirmed", `Your match result in ${match.tournament.name} has been confirmed.`);
  return { success: "Result confirmed." };
}

export async function disputeResult(matchId: string): Promise<ResultActionState> {
  const { match, isHome, isAway, isOrganizer } = await loadMatchForPlayer(matchId);
  if (!isHome && !isAway && !isOrganizer) {
    return { error: "Only the players in this match can dispute the result." };
  }
  if (match.status !== MatchStatus.PENDING_CONFIRM) {
    return { error: "There is no pending result to dispute." };
  }

  await prisma.match.update({
    where: { id: match.id },
    data: { status: MatchStatus.DISPUTED },
  });

  revalidatePath(`/tournaments/${match.tournament.slug}`);
  await createNotification(match.tournament.organizerId, "Disputed result", `A result in ${match.tournament.name} has been disputed and needs your review.`);
  return { success: "Result disputed. An organizer must resolve it." };
}

export async function overrideResult(matchId: string, _prev: ResultActionState, formData: FormData): Promise<ResultActionState> {
  const parsed = resultSchema.safeParse({
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    homeShootout: formData.get("homeShootout") || undefined,
    awayShootout: formData.get("awayShootout") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid score." };
  }

  const { session, match, isOrganizer } = await loadMatchForPlayer(matchId);
  if (!isOrganizer) {
    return { error: "Only the tournament organizer can override results." };
  }

  const { homeScore, awayScore, homeShootout, awayShootout } = parsed.data;
  const outcome = winnerOf({ roundType: match.roundType, homeScore, awayScore, homeShootout, awayShootout });
  if (match.roundType !== RoundType.GROUP && match.roundType !== RoundType.SWISS && !outcome.resolved) {
    return { error: "Knockout matches need a winner. Provide penalty shootout scores for a draw." };
  }

  const previousData = {
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homeShootout: match.homeShootout,
    awayShootout: match.awayShootout,
    status: match.status,
  };

  await prisma.$transaction([
    prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore,
        awayScore,
        homeShootout: homeShootout ?? null,
        awayShootout: awayShootout ?? null,
        winnerId: outcome.resolved
          ? outcome.winner === "HOME"
            ? match.homeRegistrationId
            : match.awayRegistrationId
          : null,
        status: MatchStatus.CONFIRMED,
        confirmedById: session.user.id,
      },
    }),
    prisma.overrideLog.create({
      data: {
        tournamentId: match.tournamentId,
        matchId: match.id,
        actorId: session.user.id,
        action: "RESULT_OVERRIDE",
        previousData,
        newData: { homeScore, awayScore, homeShootout, awayShootout, status: "CONFIRMED" },
      },
    }),
  ]);

  await handleMatchResolution(match.id);

  revalidatePath(`/tournaments/${match.tournament.slug}`);
  await notifyMatchUsers(match, "Result updated", `An organizer updated the result in ${match.tournament.name}.`);
  return { success: "Result overridden and confirmed." };
}

export async function markWalkover(matchId: string, winner: "HOME" | "AWAY"): Promise<ResultActionState> {
  const { session, match, isOrganizer } = await loadMatchForPlayer(matchId);
  if (!isOrganizer) {
    return { error: "Only the tournament organizer can declare a walkover." };
  }
  if (match.status === MatchStatus.CONFIRMED || match.status === MatchStatus.WALKOVER) {
    return { error: "This match is already decided." };
  }

  const winnerId = winner === "HOME" ? match.homeRegistrationId : match.awayRegistrationId;

  await prisma.$transaction([
    prisma.match.update({
      where: { id: match.id },
      data: {
        status: MatchStatus.WALKOVER,
        winnerId,
        homeScore: winner === "HOME" ? 3 : 0,
        awayScore: winner === "AWAY" ? 3 : 0,
        confirmedById: session.user.id,
      },
    }),
    prisma.overrideLog.create({
      data: {
        tournamentId: match.tournamentId,
        matchId: match.id,
        actorId: session.user.id,
        action: "WALKOVER",
        newData: { winner },
      },
    }),
  ]);

  await handleMatchResolution(match.id);

  revalidatePath(`/tournaments/${match.tournament.slug}`);
  await notifyMatchUsers(match, "Walkover", `A walkover was declared in ${match.tournament.name}.`);
  return { success: "Walkover declared." };
}
