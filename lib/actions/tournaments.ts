"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  RegistrationStatus,
  Role,
  TournamentFormat,
  TournamentStatus,
} from "@/lib/generated/prisma";
import { createNotification } from "@/lib/services/notifications";
import { addPlayersToTournament, removePlayerFromTournament } from "@/lib/services/roster";

export type TournamentActionState = { error?: string; success?: string } | undefined;

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "tournament"
  );
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (await prisma.tournament.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix++;
  }
  return slug;
}

const createSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  rules: z.string().optional(),
  format: z.enum(["GROUP_KNOCKOUT", "SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "SWISS"]),
  maxPlayers: z.coerce.number().int().min(2).max(512).optional(),
  matchDeadlineDays: z.coerce.number().int().min(1).max(60).optional(),
  groupSize: z.coerce.number().int().min(2).max(16).optional(),
  qualifiersPerGroup: z.coerce.number().int().min(1).optional(),
  thirdPlaceMatch: z.coerce.boolean().optional(),
});

export async function createTournament(_prev: TournamentActionState, formData: FormData): Promise<TournamentActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in to create a tournament." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.role !== Role.ORGANIZER && user.role !== Role.BOTH)) {
    return { error: "Only organizers can create tournaments." };
  }

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    rules: formData.get("rules") || undefined,
    format: formData.get("format"),
    maxPlayers: formData.get("maxPlayers") || undefined,
    matchDeadlineDays: formData.get("matchDeadlineDays") || undefined,
    groupSize: formData.get("groupSize") || undefined,
    qualifiersPerGroup: formData.get("qualifiersPerGroup") || undefined,
    thirdPlaceMatch: formData.get("thirdPlaceMatch") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const { name, description, rules, format, maxPlayers, matchDeadlineDays, groupSize, qualifiersPerGroup, thirdPlaceMatch } = parsed.data;

  const isGroup = format === TournamentFormat.GROUP_KNOCKOUT;
  const scoringConfig = { win: 3, draw: 1, loss: 0, thirdPlaceMatch: thirdPlaceMatch ?? true };

  const slug = await ensureUniqueSlug(slugify(name));
  const tournament = await prisma.tournament.create({
    data: {
      slug,
      name,
      description,
      rules,
      format,
      status: TournamentStatus.OPEN,
      maxPlayers,
      matchDeadlineDays,
      groupConfig:
        isGroup && groupSize
          ? { groupSize, qualifiersPerGroup: qualifiersPerGroup ?? 2 }
          : undefined,
      scoringConfig,
      organizerId: user.id,
    },
  });

  redirect(`/tournaments/${tournament.slug}`);
}

export async function joinTournament(tournamentId: string): Promise<TournamentActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in to join." };
  }

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    return { error: "Tournament not found." };
  }
  if (tournament.status !== TournamentStatus.OPEN && tournament.status !== TournamentStatus.APPROVAL) {
    return { error: "This tournament is not accepting registrations." };
  }

  const approvedCount = await prisma.tournamentPlayer.count({
    where: { tournamentId, status: RegistrationStatus.APPROVED },
  });
  if (tournament.maxPlayers && approvedCount >= tournament.maxPlayers) {
    return { error: "This tournament is full." };
  }

  const existing = await prisma.tournamentPlayer.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId: session.user.id } },
  });
  if (existing) {
    return { error: "You are already registered for this tournament." };
  }

  await prisma.tournamentPlayer.create({
    data: {
      tournamentId,
      playerId: session.user.id,
      status: RegistrationStatus.PENDING,
    },
  });

  await createNotification(
    tournament.organizerId,
    "New registration",
    `${session.user.name} wants to join ${tournament.name}.`,
  );

  revalidatePath(`/tournaments/${tournament.slug}`);
  return { success: "Registration submitted. Waiting for organizer approval." };
}

export async function cancelRegistration(registrationId: string): Promise<TournamentActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const registration = await prisma.tournamentPlayer.findUnique({ where: { id: registrationId } });
  if (!registration) {
    return { error: "Registration not found." };
  }
  if (registration.playerId !== session.user.id) {
    return { error: "You can only cancel your own registration." };
  }
  if (registration.status === RegistrationStatus.APPROVED) {
    return { error: "Approved registrations must be removed by the organizer." };
  }

  await prisma.tournamentPlayer.delete({ where: { id: registrationId } });
  revalidatePath("/dashboard");
  return { success: "Registration cancelled." };
}

export async function setRegistrationStatus(
  registrationId: string,
  status: "APPROVED" | "REJECTED",
): Promise<TournamentActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const registration = await prisma.tournamentPlayer.findUnique({
    where: { id: registrationId },
    include: { tournament: true },
  });
  if (!registration) {
    return { error: "Registration not found." };
  }
  if (registration.tournament.organizerId !== session.user.id) {
    return { error: "Only the tournament organizer can approve registrations." };
  }

  await prisma.tournamentPlayer.update({
    where: { id: registrationId },
    data: { status: status === "APPROVED" ? RegistrationStatus.APPROVED : RegistrationStatus.REJECTED },
  });

  await createNotification(
    registration.playerId,
    status === "APPROVED" ? "Registration approved" : "Registration declined",
    status === "APPROVED"
      ? `You have been approved for ${registration.tournament.name}.`
      : `Your registration for ${registration.tournament.name} was declined.`,
  );

  revalidatePath(`/tournaments/${registration.tournament.slug}`);
  return { success: `Registration ${status === "APPROVED" ? "approved" : "rejected"}.` };
}

const addPlayersSchema = z.object({
  names: z.string().min(1, "Enter at least one player name"),
});

/**
 * Lets the organizer enter players manually (one name per line). Existing
 * accounts are matched by name and linked; unknown names get a placeholder
 * account so their profile, fixtures, and trophies can be tracked.
 *
 * Once the roster is complete (maxPlayers reached, or 2+ players when no cap
 * is set), fixtures, standings, and the bracket are generated automatically.
 */
export async function addPlayers(
  tournamentId: string,
  _prev: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    return { error: "Tournament not found." };
  }
  if (tournament.organizerId !== session.user.id) {
    return { error: "Only the tournament organizer can add players." };
  }
  if (tournament.status === TournamentStatus.COMPLETED || tournament.status === TournamentStatus.CANCELLED) {
    return { error: "This tournament has ended." };
  }
  const existingMatches = await prisma.match.count({ where: { tournamentId } });
  if (existingMatches > 0) {
    return { error: "Fixtures have already been generated. Players can no longer be added." };
  }

  const parsed = addPlayersSchema.safeParse({ names: formData.get("names") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid player list." };
  }

  const names = parsed.data.names
    .split(/\r?\n/)
    .map((n) => n.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 256);

  if (names.length === 0) {
    return { error: "Enter at least one player name." };
  }

  let result: Awaited<ReturnType<typeof addPlayersToTournament>>;
  try {
    result = await addPlayersToTournament(tournamentId, names);
  } catch (e) {
    console.error(e);
    return { error: "Failed to add players. Please try again." };
  }

  revalidatePath(`/tournaments/${tournament.slug}`);
  const summary = [
    result.added > 0 ? `${result.added} new player${result.added === 1 ? "" : "s"} added` : null,
    result.linked > 0 ? `${result.linked} linked to existing accounts` : null,
    result.skipped > 0 ? `${result.skipped} already registered` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return {
    success: result.started
      ? `${summary}. Fixtures, standings, and the bracket were generated automatically.`
      : `${summary}.`,
  };
}

/**
 * Removes a player's registration before fixtures are generated. Only the
 * organizer can remove players, and only while the roster can still change.
 */
export async function removePlayer(registrationId: string): Promise<TournamentActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const registration = await prisma.tournamentPlayer.findUnique({
    where: { id: registrationId },
    include: { tournament: { select: { id: true, slug: true, organizerId: true } } },
  });
  if (!registration) {
    return { error: "Registration not found." };
  }
  if (registration.tournament.organizerId !== session.user.id) {
    return { error: "Only the tournament organizer can remove players." };
  }

  const existingMatches = await prisma.match.count({
    where: { tournamentId: registration.tournament.id },
  });
  if (existingMatches > 0) {
    return { error: "Players can no longer be removed after fixtures are generated." };
  }

  let name: string;
  try {
    name = await removePlayerFromTournament(registrationId);
  } catch (e) {
    console.error(e);
    return { error: "Failed to remove player." };
  }

  revalidatePath(`/tournaments/${registration.tournament.slug}`);
  return { success: `${name} removed.` };
}

/**
 * Permanently deletes a tournament (fixtures, groups, registrations, trophies,
 * and overrides are removed with it). Only the organizer can delete a
 * tournament. Placeholder accounts that were created for its roster and are no
 * longer used by any tournament are cleaned up too.
 */
export async function deleteTournament(
  _prev: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const tournamentId = String(formData.get("tournamentId") ?? "");
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    return { error: "Tournament not found." };
  }
  if (tournament.organizerId !== session.user.id) {
    return { error: "Only the tournament organizer can delete this tournament." };
  }

  const registrations = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    select: { player: { select: { id: true, email: true } } },
  });

  await prisma.tournament.delete({ where: { id: tournamentId } });

  for (const r of registrations) {
    if (r.player.email.endsWith("@players.local")) {
      const remaining = await prisma.tournamentPlayer.count({ where: { playerId: r.player.id } });
      if (remaining === 0) {
        await prisma.user.delete({ where: { id: r.player.id } }).catch(() => {});
      }
    }
  }

  revalidatePath("/tournaments");
  revalidatePath("/dashboard");
  redirect("/tournaments");
}
