const statusStyles: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  OPEN: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  APPROVAL: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  ACTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  COMPLETED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        statusStyles[status] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
