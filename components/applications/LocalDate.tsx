"use client";

// Dates are shown in the viewer's own time zone, not the server's.
export default function LocalDate({ iso, withTime = false }: { iso: string; withTime?: boolean }) {
  const date = new Date(iso);
  const text = withTime
    ? date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
