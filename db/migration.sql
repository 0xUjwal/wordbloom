-- Reference migration for manual provisioning. The app also applies this
-- idempotently on first request, so running it by hand is optional.
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
