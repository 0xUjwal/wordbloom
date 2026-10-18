import { getGoogleUser } from '../../auth';
import { ensureSchema, getSql } from '../../../db';
import { cleanWord, definition, problem } from '../../dictionary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const word = cleanWord(new URL(request.url).searchParams.get('word'));
    const user = await getGoogleUser();
    if (user) {
      await ensureSchema();
      const saved = await getSql()`
        SELECT entry FROM words WHERE user_id = ${user.userId} AND word = ${word}`;
      if (saved[0]) {
        const entry = JSON.parse(saved[0].entry);
        if (entry.meanings?.length)
          return Response.json({ entry }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
      }
    }
    const entry = await definition(word);
    if (user)
      await getSql()`
        UPDATE words SET entry = ${JSON.stringify(entry)}
        WHERE user_id = ${user.userId} AND word = ${word}`;
    return Response.json({ entry }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
  } catch (e) {
    return problem(e);
  }
}
