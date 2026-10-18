import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "../../../db";
import { newToken, pkceChallenge, tokenHash } from "../../../lib/google-oidc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return new NextResponse("Google sign-in is not configured.", { status: 503 });
  }
  const origin = request.nextUrl.origin;
  const attempt = newToken();
  const state = newToken();
  const nonce = newToken();
  const verifier = newToken();
  const sql = getSql();
  await ensureSchema();
  await sql`DELETE FROM oauth_attempts WHERE expires_at < ${Date.now()}`;
  await sql`DELETE FROM sessions WHERE expires_at < ${Date.now()}`;
  await sql`
    INSERT INTO oauth_attempts (token_hash, state, nonce, verifier, expires_at)
    VALUES (${tokenHash(attempt)}, ${state}, ${nonce}, ${verifier}, ${Date.now() + 600000})`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: origin + "/auth/google/callback",
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  const response = NextResponse.redirect(
    "https://accounts.google.com/o/oauth2/v2/auth?" + params
  );
  response.cookies.set("wb_oauth", attempt, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    secure: origin.startsWith("https:"),
  });
  return response;
}
