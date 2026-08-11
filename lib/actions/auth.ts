"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EFootballPlatform, Role } from "@/lib/generated/prisma";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["PLAYER", "ORGANIZER", "BOTH"]),
  eFootballGamertag: z.string().trim().optional(),
  eFootballPlatform: z.enum(["PS", "XBOX", "PC", "MOBILE"]).optional(),
  eFootballPlayerId: z.string().trim().optional(),
});

export type AuthState = { error?: string; success?: string } | undefined;

export async function registerUser(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    eFootballGamertag: formData.get("eFootballGamertag") || undefined,
    eFootballPlatform: formData.get("eFootballPlatform") || undefined,
    eFootballPlayerId: formData.get("eFootballPlayerId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: parsed.data.role as Role,
      eFootballGamertag: parsed.data.eFootballGamertag,
      eFootballPlatform: parsed.data.eFootballPlatform as EFootballPlatform | undefined,
      eFootballPlayerId: parsed.data.eFootballPlayerId,
    },
  });

  redirect("/login?registered=1");
}

export async function loginUser(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  redirect("/dashboard");
}

export async function logoutUser(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
