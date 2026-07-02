// Uses Web Crypto (not Node's `crypto` module) so this works unmodified in
// both the Edge runtime (middleware.ts) and the Node runtime (API routes).

const COOKIE_NAME = "sofi_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

async function hmacKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(): Promise<string> {
  const issued = Date.now().toString();
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(issued));
  return `${issued}.${toHex(sig)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [issued, sig] = token.split(".");
  if (!issued || !sig) return false;

  const key = await hmacKey();
  const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(issued));
  const expectedHex = toHex(expectedSig);
  if (expectedHex.length !== sig.length) return false;

  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (diff !== 0) return false;

  const age = Date.now() - Number(issued);
  return age >= 0 && age < MAX_AGE_SECONDS * 1000;
}

export const COOKIE = { name: COOKIE_NAME, maxAge: MAX_AGE_SECONDS };
