import { getGoogleUser } from '../../auth';
import { ensureSchema, getSql } from '../../../db';
import { cleanWord, definition, problem } from '../../dictionary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unauthorized = () =>
  Response.json(
    { error: 'Please sign in to open your personal collection.' },
    { status: 401 }
  );

function crossOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return origin && origin !== new URL(request.url).origin;
}

export async function GET() {
  const user = await getGoogleUser();
  if (!user) return unauthorized();
  try {
    await ensureSchema();
    const rows = await getSql()`
      SELECT entry, note, created_at FROM words
      WHERE user_id = ${user.userId} AND deleted_at IS NULL
      ORDER BY created_at ASC, word ASC`;
    return Response.json(
      {
        words: rows.map((row) => ({
          ...JSON.parse(row.entry),
          note: row.note || '',
          addedAt: Number(row.created_at),
        })),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    return problem(e);
  }
}

export async function POST(request: Request) {
  const user = await getGoogleUser();
  if (!user) return unauthorized();
  if (crossOrigin(request))
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const word = cleanWord(((await request.json()) as { word?: unknown }).word);
    const sql = getSql();
    await ensureSchema();
    const existing = await sql`
      SELECT entry, note, deleted_at FROM words WHERE user_id = ${user.userId} AND word = ${word}`;
    if (existing[0]) {
      if (existing[0].deleted_at)
        await sql`UPDATE words SET deleted_at = NULL WHERE user_id = ${user.userId} AND word = ${word}`;
      return Response.json({
        entry: { ...JSON.parse(existing[0].entry), note: existing[0].note || '' },
      });
    }
    const entry = {
      word,
      meanings: [],
      source: 'https://en.wiktionary.org/wiki/' + encodeURIComponent(word),
    };
    await sql`
      INSERT INTO words (user_id, word, entry, created_at)
      VALUES (${user.userId}, ${word}, ${JSON.stringify(entry)}, ${Date.now()})
      ON CONFLICT (user_id, word) DO NOTHING`;
    return Response.json(
      { entry: { ...entry, note: '', addedAt: Date.now() } },
      { status: 201 }
    );
  } catch (e) {
    return problem(e);
  }
}


export async function PATCH(request: Request) {
  const user = await getGoogleUser();
  if (!user) return unauthorized();
  if (crossOrigin(request))
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const body = (await request.json()) as {
      word?: unknown;
      all?: unknown;
      restore?: unknown;
      note?: unknown;
    };
    const sql = getSql();
    await ensureSchema();
    if (body.restore === true) {
      if (body.all === true) {
        await sql`
          UPDATE words SET deleted_at = NULL
          WHERE user_id = ${user.userId} AND deleted_at = (
            SELECT max(deleted_at) FROM words WHERE user_id = ${user.userId})`;
        return Response.json({ restoredAll: true });
      }
      const word = cleanWord(body.word);
      await sql`UPDATE words SET deleted_at = NULL WHERE user_id = ${user.userId} AND word = ${word}`;
      return Response.json({ restored: true });
    }
    if (typeof body.note === 'string') {
      const word = cleanWord(body.word);
      const note = body.note.slice(0, 500);
      await sql`UPDATE words SET note = ${note} WHERE user_id = ${user.userId} AND word = ${word} AND deleted_at IS NULL`;
      return Response.json({ saved: true });
    }
    return Response.json({ error: 'Unsupported request.' }, { status: 400 });
  } catch (e) {
    return problem(e);
  }
}

export async function DELETE(request: Request) {
  const user = await getGoogleUser();
  if (!user) return unauthorized();
  if (crossOrigin(request))
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const body = (await request.json()) as { word?: unknown; all?: unknown };
    const sql = getSql();
    await ensureSchema();
    if (body.all === true) {
      await sql`UPDATE words SET deleted_at = ${Date.now()} WHERE user_id = ${user.userId} AND deleted_at IS NULL`;
      return Response.json({ removedAll: true });
    }
    const word = cleanWord(body.word);
    await sql`UPDATE words SET deleted_at = ${Date.now()} WHERE user_id = ${user.userId} AND word = ${word}`;
    return Response.json({ removed: true });
  } catch (e) {
    return problem(e);
  }
}
