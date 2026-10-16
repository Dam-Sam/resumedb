"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { generateKey } from "@/lib/agent/keys";
import { createClient } from "@/lib/supabase/server";

// API keys for AI agents. Created and revoked as the signed-in user (RLS keeps
// it to their own keys). The key itself is returned once and never stored.

export async function createApiKey(name: string): Promise<{ key?: string; error?: string }> {
  const parsed = z.string().trim().min(1).max(60).safeParse(name);
  if (!parsed.success) return { error: "Give the key a name (up to 60 characters)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const { key, prefix, hash } = generateKey();
  const { error } = await supabase.from("api_keys").insert({ user_id: user.id, name: parsed.data, prefix, key_hash: hash });
  if (error) {
    console.error("createApiKey failed:", error.message);
    return { error: "Couldn't create the key. Please try again." };
  }
  refresh();
  return { key };
}

// Revoking deletes the key; agents using it get 401 from then on.
export async function revokeApiKey(id: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) return { error: "Unknown key." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const { error } = await supabase.from("api_keys").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("revokeApiKey failed:", error.message);
    return { error: "Couldn't revoke the key. Please try again." };
  }
  refresh();
  return {};
}
