import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logoutUser } from "@/lib/actions/auth";
import { EFootballLogo } from "@/components/efootball-logo";

export default async function Nav() {
  const session = await auth();
  const unread = session?.user
    ? await prisma.notification.count({ where: { userId: session.user.id, read: false } })
    : 0;

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-zinc-900 dark:text-zinc-100"
        >
          <EFootballLogo className="h-7 w-auto" />
          <span className="text-lg font-bold tracking-tight">League</span>
        </Link>

        <div className="flex items-center gap-3 overflow-x-auto text-sm sm:gap-4">
          {session?.user ? (
            <>
              <Link href="/tournaments" className="shrink-0 hover:underline">
                Tournaments
              </Link>
              <Link href="/dashboard" className="shrink-0 hover:underline">
                Dashboard
              </Link>
              <Link href="/profile" className="shrink-0 hover:underline">
                Profile
              </Link>
              <Link href="/trophies" className="shrink-0 hover:underline">
                Trophies
              </Link>
              <Link href="/notifications" className="relative shrink-0 hover:underline">
                Notifications
                {unread > 0 && (
                  <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <span className="hidden text-zinc-500 sm:inline">{session.user.name}</span>
              <form action={logoutUser} className="shrink-0">
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/tournaments" className="shrink-0 hover:underline">
                Tournaments
              </Link>
              <Link href="/login" className="shrink-0 hover:underline">
                Sign in
              </Link>
              <Link
                href="/register"
                className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
