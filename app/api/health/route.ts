import { ensureSchema, getSql } from '../../../db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness + database connectivity probe. Reports status only, never details. */
export async function GET() {
  try {
    await ensureSchema();
    await getSql()`SELECT 1`;
    return Response.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return Response.json(
      { ok: false },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
