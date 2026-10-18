import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "../../../db";
import { tokenHash } from "../../../lib/google-oidc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse("Invalid request", { status: 403 });
  }
  const session = request.cookies.get("wb_session")?.value;
  if (session) {
    try {
      await ensureSchema();
      await getSql()`DELETE FROM sessions WHERE token_hash = ${tokenHash(session)}`;
    } catch (error) {
      console.error("Session cleanup failed", error);
    }
  }
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set("wb_session", "", { path: "/", maxAge: 0 });
  return response;
}
