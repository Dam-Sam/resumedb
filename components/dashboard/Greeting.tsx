"use client";

import { useState } from "react";

// "Good morning, Sam." on the viewer's clock.
export default function Greeting({ name }: { name: string | null }) {
  const [hour] = useState(() => new Date().getHours());
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <h1 suppressHydrationWarning>
      {hello}
      {name ? `, ${name}` : ""}.
    </h1>
  );
}
