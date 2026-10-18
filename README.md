# Wordbloom

Wordbloom is a personal vocabulary canvas. Save words as bubbles, explore their definitions and pronunciation, and manage your collection from a compact, zoomable cluster. Words sync across devices through Google sign-in and a Postgres database.

## Requirements

- Node.js 22.13 or newer
- npm
- A Postgres database (Neon works well; free plan available through the Vercel Marketplace)
- A Google OAuth 2.0 "Web application" client

## Setup

1. Copy `.env.example` to `.env.local` and fill in the values. Never commit real secrets.
2. In Google Cloud Console, add authorized redirect URIs to your OAuth client:
   - `http://localhost:3000/auth/google/callback` for local development
   - `https://<your-domain>/auth/google/callback` for production
3. `npm ci`

The app creates its tables (`words`, `sessions`, `oauth_attempts`) automatically on first request; `db/migration.sql` is the same schema for manual provisioning.

## Local development

```sh
npm run dev
```

Open http://localhost:3000 and sign in with Google.

## Deploy to Vercel

Import the repository in Vercel (framework preset: Next.js, zero configuration) and set `DATABASE_URL`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the project's environment variables. Neon can be provisioned directly from the Vercel dashboard's Storage tab; its integration adds `DATABASE_URL` automatically. Add the production redirect URI to your Google OAuth client once the domain is known.

## Authentication and data

Sign-in uses Google OAuth with PKCE, state and nonce validation, and verified ID tokens. Sessions are random tokens stored hashed in Postgres and kept in an HTTP-only cookie. Word records are keyed by the stable Google user ID. Definition lookup uses the Free Dictionary API, with Wiktionary as a fallback source.

## Useful commands

- `npm run dev` — start the local development server
- `npm run build` — create the production build
- `npm run start` — serve the production build locally
- `npm run lint` — run ESLint
