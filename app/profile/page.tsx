import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { _count: { select: { trophies: true } } },
  });
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <p className="text-sm text-zinc-500">
          <Link href={`/players/${user.id}`} className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            View public profile
          </Link>{" "}
          · {user._count.trophies} {user._count.trophies === 1 ? "championship" : "championships"}
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-4 font-semibold">eFootball identity</h2>
        <ProfileForm
          profile={{
            name: user.name,
            eFootballGamertag: user.eFootballGamertag,
            eFootballPlatform: user.eFootballPlatform,
            eFootballPlayerId: user.eFootballPlayerId,
          }}
        />
      </section>
    </main>
  );
}
