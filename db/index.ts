import postgres from "postgres";

let client: postgres.Sql | null = null;
let schemaReady: Promise<unknown> | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS words (
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  entry TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, word)
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS oauth_attempts (
  token_hash TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  nonce TEXT NOT NULL,
  verifier TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);
`;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Create a Postgres database (Neon from the Vercel Marketplace works well) and add DATABASE_URL to the environment."
    );
  }
  if (!client) {
    const local = /^postgres(ql)?:\/\/[^@/]*@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/i.test(url);
    client = postgres(url, { prepare: false, ssl: local ? false : "require" });
  }
  return client;
}

/** Idempotent table setup so a fresh database works without a separate migration step. */
export function ensureSchema() {
  schemaReady ??= getSql().unsafe(SCHEMA).simple();
  return schemaReady;
}
