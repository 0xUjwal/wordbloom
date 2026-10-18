import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "../../../../db";
import { newToken, tokenHash, validateIdToken } from "../../../../lib/google-oidc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(origin: string, reason: string) {
  const response = NextResponse.redirect(
    new URL("/?signin=" + encodeURIComponent(reason), origin),
    303
  );
  response.cookies.set("wb_oauth", "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = url.origin;
  try {
    const attempt = request.cookies.get("wb_oauth")?.value;
    if (!attempt) throw new Error("Invalid sign-in attempt");
    const sql = getSql();
    await ensureSchema();
    const attempts = await sql`
      DELETE FROM oauth_attempts WHERE token_hash = ${tokenHash(attempt)}
      RETURNING state, nonce, verifier, expires_at`;
    const saved = attempts[0];
    if (
      !saved ||
      Number(saved.expires_at) < Date.now() ||
      saved.state !== url.searchParams.get("state") ||
      url.searchParams.has("error") ||
      !url.searchParams.get("code")
    ) {
      throw new Error("Invalid sign-in attempt");
    }
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: url.searchParams.get("code")!,
        client_id: clientId,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: origin + "/auth/google/callback",
        grant_type: "authorization_code",
        code_verifier: saved.verifier,
      }).toString(),
      signal: AbortSignal.timeout(12000),
    });
    const tokens = (await tokenResponse.json()) as {
      error?: string;
      id_token?: string;
    };
    if (!tokenResponse.ok || !tokens.id_token) {
      throw Object.assign(new Error("Google token exchange failed"), {
        signinReason: ["invalid_client", "invalid_grant", "redirect_uri_mismatch"].includes(
          tokens.error ?? ""
        )
          ? tokens.error!
          : "exchange_failed",
      });
    }
    const identity = await validateIdToken(tokens.id_token, clientId, saved.nonce);
    const old = request.cookies.get("wb_session")?.value;
    if (old) await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash(old)}`;
    const session = newToken();
    await sql`
      INSERT INTO sessions (token_hash, user_id, name, email, expires_at)
      VALUES (${tokenHash(session)}, ${identity.id}, ${identity.name}, ${identity.email}, ${Date.now() + 604800000})`;
    const response = NextResponse.redirect(new URL("/", origin), 303);
    response.cookies.set("wb_session", session, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 604800,
      secure: origin.startsWith("https:"),
    });
    response.cookies.set("wb_oauth", "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    const reason =
      (error as { signinReason?: string }).signinReason ??
      (["ABORT_ERR", "ETIMEDOUT"].includes((error as NodeJS.ErrnoException).code ?? "")
        ? "connection_timeout"
        : "failed");
    return fail(origin, reason);
  }
}
