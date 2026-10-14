import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Refresh tokens are encrypted before they reach the database, so a leaked
// row (or a too-broad query) doesn't hand out access to someone's inbox.
// EMAIL_TOKEN_KEY: 32 random bytes, base64 (`openssl rand -base64 32`).

function key() {
  const k = Buffer.from(process.env.EMAIL_TOKEN_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("EMAIL_TOKEN_KEY must be 32 bytes, base64-encoded.");
  return k;
}

// "v1.<iv>.<tag>.<ciphertext>", all base64url.
export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decryptToken(stored: string): string {
  const [version, iv, tag, data] = stored.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unrecognized token format.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
