"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EFootballPlatform } from "@/lib/generated/prisma";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  eFootballGamertag: z.string().trim().optional(),
  eFootballPlatform: z.enum(["PS", "XBOX", "PC", "MOBILE"]).optional(),
  eFootballPlayerId: z.string().trim().optional(),
});

export type ProfileActionState = { error?: string; success?: string } | undefined;

export async function updateProfile(_prev: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "You must be signed in." };
  }

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    eFootballGamertag: formData.get("eFootballGamertag") || undefined,
    eFootballPlatform: formData.get("eFootballPlatform") || undefined,
    eFootballPlayerId: formData.get("eFootballPlayerId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      eFootballGamertag: parsed.data.eFootballGamertag || null,
      eFootballPlatform: parsed.data.eFootballPlatform as EFootballPlatform | undefined,
      eFootballPlayerId: parsed.data.eFootballPlayerId || null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: "Profile updated." };
}
