import { cookies } from "next/headers";
import { ensureSchema, getSql } from "../db";
import { tokenHash } from "../lib/google-oidc";

export type GoogleUser = {
  userId: string;
  displayName: string;
  email: string;
};

export async function getGoogleUser(): Promise<GoogleUser | null> {
  try {
    const store = await cookies();
    const value = store.get("wb_session")?.value;
    if (!value) return null;
    await ensureSchema();
    const rows = await getSql()`
      SELECT user_id, name, email FROM sessions
      WHERE token_hash = ${tokenHash(value)} AND expires_at > ${Date.now()}
      LIMIT 1`;
    const row = rows[0];
    return row
      ? { userId: row.user_id, displayName: row.name, email: row.email }
      : null;
  } catch (error) {
    console.error("Session lookup failed", error);
    return null;
  }
}
