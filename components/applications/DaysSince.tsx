"use client";

import { useState } from "react";

// "today", "1 day ago", "12 days ago", counted on the viewer's clock.
export default function DaysSince({ iso }: { iso: string }) {
  const [now] = useState(() => Date.now());
  const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
  const text = days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
