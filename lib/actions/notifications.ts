"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { markNotificationsRead } from "@/lib/services/notifications";

export async function markAllRead(): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  await markNotificationsRead(session.user.id);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
