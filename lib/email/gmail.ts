import "server-only";
import { htmlToText, parseAddress } from "./text";
import type { IncomingEmail } from "./types";

// The handful of Google OAuth and Gmail REST calls the tracker needs.
// Read-only access: we never send, change, or delete mail.

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

// Holds the OAuth state between "Connect Gmail" and Google's redirect back.
export const STATE_COOKIE = "gmail_oauth_state";

// Google says the refresh token no longer works (revoked, expired, password changed).
export class GmailAuthError extends Error {}
// The saved history id is too old for Gmail to list changes from.
export class HistoryExpiredError extends Error {}

export function authUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: `openid email ${GMAIL_SCOPE}`,
    // Offline + consent: Google only returns a refresh token when both are set.
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...body,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (json.error === "invalid_grant") throw new GmailAuthError(json.error_description ?? "invalid_grant");
    throw new Error(`Google token request failed: ${res.status} ${json.error ?? ""}`);
  }
  return json as { access_token: string; refresh_token?: string; scope: string; expires_in: number };
}

export function exchangeCode(code: string, redirectUri: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
}

export async function accessToken(refreshToken: string): Promise<string> {
  return (await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken })).access_token;
}

// Best effort: the user can also remove access from their Google account.
export async function revoke(token: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
}

async function gmail<T>(access: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json", ...init.headers },
  });
  if (res.status === 401) throw new GmailAuthError("Gmail rejected the access token.");
  if (!res.ok) {
    const err = new Error(`Gmail ${init.method ?? "GET"} ${path.split("?")[0]} failed: ${res.status}`);
    Object.assign(err, { status: res.status });
    throw err;
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export function getProfile(access: string) {
  return gmail<{ emailAddress: string; historyId: string }>(access, "/profile");
}

// Push notifications for the inbox go to our Pub/Sub topic until `expiration`
// (about 7 days). Calling it again renews it.
export async function watch(access: string) {
  const res = await gmail<{ historyId: string; expiration: string }>(access, "/watch", {
    method: "POST",
    body: JSON.stringify({
      topicName: process.env.GMAIL_PUBSUB_TOPIC,
      labelIds: ["INBOX"],
      labelFilterBehavior: "include",
    }),
  });
  return { historyId: res.historyId, expiresAt: new Date(Number(res.expiration)).toISOString() };
}

export async function stopWatch(access: string) {
  await gmail(access, "/stop", { method: "POST" });
}

interface HistoryPage {
  history?: { messagesAdded?: { message: { id: string; labelIds?: string[] } }[] }[];
  nextPageToken?: string;
  historyId: string;
}

// Ids of messages that arrived in the inbox after `startHistoryId`, oldest first,
// and the history id to resume from next time.
export async function newInboxMessages(access: string, startHistoryId: string) {
  const ids: string[] = [];
  let pageToken: string | undefined;
  let latest = startHistoryId;
  do {
    const params = new URLSearchParams({ startHistoryId, historyTypes: "messageAdded", labelId: "INBOX" });
    if (pageToken) params.set("pageToken", pageToken);
    let page: HistoryPage;
    try {
      page = await gmail<HistoryPage>(access, `/history?${params}`);
    } catch (err) {
      if ((err as { status?: number }).status === 404) throw new HistoryExpiredError("Gmail history id expired.");
      throw err;
    }
    for (const h of page.history ?? []) {
      for (const { message } of h.messagesAdded ?? []) {
        if (!ids.includes(message.id)) ids.push(message.id);
      }
    }
    latest = page.historyId;
    pageToken = page.nextPageToken;
  } while (pageToken);
  return { ids, historyId: latest };
}

interface Part {
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string };
  parts?: Part[];
}

// One message as the pipeline wants it, or null if it's gone or isn't incoming mail.
export async function getMessage(access: string, id: string): Promise<IncomingEmail | null> {
  let msg: { id: string; labelIds?: string[]; internalDate: string; payload: Part };
  try {
    msg = await gmail(access, `/messages/${id}?format=full`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null; // deleted since
    throw err;
  }
  if (msg.labelIds?.some((l) => l === "SENT" || l === "DRAFT" || l === "SPAM")) return null;

  const header = (name: string) => msg.payload.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";
  const from = parseAddress(header("from"));
  return {
    provider: "gmail",
    providerMessageId: msg.id,
    fromAddress: from.address,
    fromName: from.name,
    subject: header("subject"),
    receivedAt: new Date(Number(msg.internalDate)).toISOString(),
    text: bodyText(msg.payload),
  };
}

// Prefer the plain-text part; fall back to flattened HTML.
function bodyText(payload: Part): string {
  const find = (part: Part, type: string): string | null => {
    if (part.mimeType === type && part.body?.data) return Buffer.from(part.body.data, "base64url").toString("utf8");
    for (const child of part.parts ?? []) {
      const found = find(child, type);
      if (found) return found;
    }
    return null;
  };
  const plain = find(payload, "text/plain");
  if (plain?.trim()) return plain.trim();
  const html = find(payload, "text/html");
  return html ? htmlToText(html) : "";
}
