"use client";

import { createContext, useContext, useState } from "react";

// Only one profile entry is open for editing at a time.
const Ctx = createContext<{ openId: string | null; setOpenId: (id: string | null) => void }>({ openId: null, setOpenId: () => {} });

export function OpenEntryProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return <Ctx.Provider value={{ openId, setOpenId }}>{children}</Ctx.Provider>;
}

export const useOpenEntry = () => useContext(Ctx);
