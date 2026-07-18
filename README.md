# ModerationDesk Platform

ModerationDesk is a split production deployment for Discord moderation and community operations:

- `backend/` runs continuously on Railway. It owns the Discord gateway connection, moderation engine, security systems, OAuth/API routes, scheduled actions, billing webhooks and persistent data.
- `frontend/` runs on Vercel. It provides the public website, multi-guild dashboard and appeal interface.
- Vercel proxies `/api/*` to Railway. Browser traffic remains same-origin, so the dashboard can use secure HTTP-only session cookies without exposing the Railway URL or relying on third-party cookies.

## Core systems

- Multi-guild configuration and plan isolation
- Cases, warnings, notes, bans, tempbans, timeouts and channel controls
- AutoMod, anti-raid and audit-log-driven anti-nuke protection
- Button and Discord OAuth verification
- Consent-based role restoration and migration records
- Public appeals with Discord identity confirmation
- Welcome, goodbye, autoroles, sticky roles, suggestions, polls, giveaways and starboard
- Optional Stripe subscriptions
- Server data export and deletion controls

## Repository layout

```text
ModerationDesk/
├── backend/       Railway service
├── frontend/      Vercel project
├── .github/       CI validation
├── DEPLOYMENT.md  Complete deployment procedure
└── README.md
```

## Local development

Terminal 1:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Terminal 2:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Use these local values:

```env
# backend/.env
FRONTEND_BASE_URL=http://localhost:3000
BACKEND_BASE_URL=http://localhost:3001
PORT=3001

# frontend/.env.local
RAILWAY_BACKEND_URL=http://localhost:3001
```

Add these Discord OAuth redirects for local testing:

- `http://localhost:3000/api/oauth/dashboard/callback`
- `http://localhost:3000/api/oauth/verify/callback`

## Validation

```bash
cd backend && npm ci && npm run verify && npm audit --omit=dev
cd ../frontend && npm ci && npm run build && npm audit --omit=dev
```

See `DEPLOYMENT.md` for the exact Railway, Vercel, Discord and Stripe setup.
