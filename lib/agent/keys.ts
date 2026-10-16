import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Personal API keys for AI agents. "rdb_" + 32 random bytes; only the SHA-256
// is stored, so a leaked row can't be used to call the API.

export interface NewKey {
  key: string;
  prefix: string;
  hash: string;
}

export function generateKey(): NewKey {
  const key = `rdb_${randomBytes(32).toString("base64url")}`;
  return { key, prefix: `${key.slice(0, 10)}…`, hash: hashKey(key) };
}

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export interface AgentCaller {
  userId: string;
  keyId: string;
}

// "Authorization: Bearer rdb_..." → whose key it is. Needs the service-role client:
// the request has no Supabase session.
export async function authenticate(admin: SupabaseClient, request: Request): Promise<AgentCaller | null> {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(rdb_\S+)$/i);
  if (!match) return null;

  const { data } = await admin.from("api_keys").select("id, user_id").eq("key_hash", hashKey(match[1])).maybeSingle();
  if (!data) return null;

  const { error } = await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  if (error) console.error("api_keys last_used_at update failed:", error.message);
  return { userId: data.user_id, keyId: data.id };
}
