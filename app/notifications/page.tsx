import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { markAllRead } from "@/lib/actions/notifications";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-zinc-500">
            {unread > 0 ? `${unread} unread` : "You are all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No notifications yet.{" "}
          <Link href="/tournaments" className="underline">
            Find a tournament
          </Link>{" "}
          to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border px-4 py-3 ${
                n.read
                  ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-zinc-500">{n.body}</p>}
                </div>
                {!n.read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" title="Unread" />
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-400">{n.createdAt.toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
