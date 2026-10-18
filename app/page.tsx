import Board from './board';
import { getGoogleUser } from './auth';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await getGoogleUser();
  return <Board signedIn={!!user} accountName={user?.displayName} />;
}
