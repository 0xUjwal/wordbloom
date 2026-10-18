import { createHash, createPublicKey, randomBytes, verify } from "node:crypto";

export const newToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const pkceChallenge = (verifier: string) =>
  createHash("sha256").update(verifier).digest("base64url");

type Jwk = { kid?: string; kty?: string };
let jwksCache: { fetchedAt: number; keys: Jwk[] } | null = null;

async function googleSigningKeys(): Promise<Jwk[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < 10 * 60 * 1000) {
    return jwksCache.keys;
  }
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Identity keys unavailable");
  const body = (await response.json()) as { keys: Jwk[] };
  jwksCache = { fetchedAt: Date.now(), keys: body.keys };
  return body.keys;
}

export type GoogleIdentity = { id: string; name: string; email: string };

export async function validateIdToken(
  jwt: string,
  clientId: string,
  nonce: string,
  now = Date.now() / 1000
): Promise<GoogleIdentity> {
  const parts = jwt.split(".");
  if (parts.length !== 3) throw new Error("Invalid identity token");
  const head = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  const jwk = (await googleSigningKeys()).find(
    (k) => k.kid === head.kid && k.kty === "RSA"
  );
  if (
    head.alg !== "RS256" ||
    !jwk ||
    !verify(
      "RSA-SHA256",
      Buffer.from(parts[0] + "." + parts[1]),
      createPublicKey({ key: jwk, format: "jwk" } as never),
      Buffer.from(parts[2], "base64url")
    )
  ) {
    throw new Error("Invalid identity signature");
  }
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    !["https://accounts.google.com", "accounts.google.com"].includes(claims.iss) ||
    !audience.includes(clientId) ||
    (claims.azp && claims.azp !== clientId) ||
    (audience.length > 1 && claims.azp !== clientId) ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    typeof claims.iat !== "number" ||
    claims.iat > now + 60 ||
    claims.nonce !== nonce ||
    typeof claims.sub !== "string" ||
    !claims.sub ||
    claims.sub.length > 255
  ) {
    throw new Error("Invalid identity claims");
  }
  return {
    id: claims.sub,
    name: typeof claims.name === "string" ? claims.name : "Google user",
    email:
      claims.email_verified === true && typeof claims.email === "string"
        ? claims.email
        : "",
  };
}
