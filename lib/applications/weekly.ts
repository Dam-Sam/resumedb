import { STATUSES, type Status, type StatusHistory } from "./repository";

export interface WeeklySnapshots {
  // One label per column, oldest first; the last is "This week".
  weeks: string[];
  // counts[status][week]: applications sitting in that status at the end of that week.
  counts: Record<Status, number[]>;
}

const WEEK_MS = 7 * 86_400_000;
const MIN_WEEKS = 4;
const MAX_WEEKS = 10;

// How many applications sat in each status at the end of each of the last weeks,
// replaying each application's applied date and status changes. An application
// counts as "applied" until its first status change.
export function weeklySnapshots(history: StatusHistory[], now = Date.now()): WeeklySnapshots {
  const first = Math.min(...history.map((h) => new Date(h.applied_at).getTime()), now);
  const n = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.ceil((now - first) / WEEK_MS) + 1));
  const ends = Array.from({ length: n }, (_, i) => now - (n - 1 - i) * WEEK_MS);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, new Array(n).fill(0)])) as Record<Status, number[]>;
  const sorted = history.map((h) => ({
    appliedAt: new Date(h.applied_at).getTime(),
    events: h.events.map((e) => ({ status: e.status, at: new Date(e.created_at).getTime() })).sort((a, b) => a.at - b.at),
  }));

  ends.forEach((end, i) => {
    for (const app of sorted) {
      if (app.appliedAt > end) continue;
      let status: Status = "applied";
      for (const e of app.events) if (e.at <= end) status = e.status;
      counts[status][i]++;
    }
  });

  const weeks = ends.map((t, i) =>
    i === n - 1 ? "This week" : new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
  );
  return { weeks, counts };
}
