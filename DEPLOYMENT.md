# ModerationDesk deployment

This repository is intentionally split into two isolated projects. Connect the same GitHub repository to both Railway and Vercel, then select the correct root directory on each platform.

## 1. Prepare Discord

Open the Discord Developer Portal and select the ModerationDesk application.

Under **Bot**:

- Copy the bot token for `DISCORD_BOT_TOKEN`.
- Enable **Server Members Intent**.
- Enable **Message Content Intent**.
- Never place the token in GitHub or Vercel.

Copy the Application ID and Client Secret for:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`

The production OAuth redirects are added after the Vercel domain exists.

## 2. Deploy the backend to Railway

1. Create a Railway project from the GitHub repository.
2. Set the service **Root Directory** to `/backend`.
3. Railway will read `backend/railway.json` and use:
   - Railpack
   - `npm start`
   - `/health`
   - a 300-second health timeout
   - restart on failure
4. Add a persistent Railway volume and mount it at `/data`.
5. Keep this service at **one replica** while it uses the volume-backed data store.
6. Generate a Railway public domain.

Add these Railway variables first:

```env
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
SESSION_SECRET=at-least-32-random-characters
PREMIUM_ADMIN_KEY=a-different-long-random-secret
REGISTER_COMMANDS_ON_START=false
LOG_LEVEL=info
```

`PORT` and `RAILWAY_VOLUME_MOUNT_PATH` are injected by Railway. `BACKEND_BASE_URL` is optional because the application can derive it from `RAILWAY_PUBLIC_DOMAIN`.

The bot can come online before the frontend is configured. Dashboard and OAuth routes remain unavailable until `FRONTEND_BASE_URL` is added.

Confirm the Railway endpoint returns a healthy response:

```text
https://YOUR-RAILWAY-DOMAIN/health
```

## 3. Deploy the frontend to Vercel

1. Import the same GitHub repository into Vercel.
2. Set the project **Root Directory** to `frontend`.
3. Vercel should detect Next.js automatically.
4. Add this Vercel environment variable for Production, Preview and Development as appropriate:

```env
RAILWAY_BACKEND_URL=https://YOUR-RAILWAY-DOMAIN
```

5. Deploy the project.
6. Prefer a stable custom domain before enabling production OAuth. Discord redirect URIs do not support arbitrary Vercel preview domains.

The frontend proxies `/api/*` to Railway using a Next.js rewrite. Do not expose bot tokens, Discord secrets, Stripe secrets or admin keys in Vercel.

## 4. Connect Railway to the Vercel domain

Add or update this Railway variable:

```env
FRONTEND_BASE_URL=https://YOUR-VERCEL-DOMAIN
```

Use the exact production origin with no trailing slash. Railway will redeploy automatically.

Optional direct-development origins can be supplied as a comma-separated value:

```env
ALLOWED_ORIGINS=http://localhost:3000
```

Production browser requests should normally use the Vercel `/api` proxy rather than direct cross-origin access.

## 5. Add Discord OAuth redirects

In the Discord Developer Portal, add these exact redirects:

```text
https://YOUR-VERCEL-DOMAIN/api/oauth/dashboard/callback
https://YOUR-VERCEL-DOMAIN/api/oauth/verify/callback
```

The dashboard and appeal flow share the dashboard callback. Verification uses the second callback.

Then test:

1. Open `https://YOUR-VERCEL-DOMAIN`.
2. Select **Open dashboard**.
3. Sign in with Discord.
4. Confirm manageable servers appear.
5. Open a server and save a harmless setting.

## 6. Register Discord commands

For fast testing in one server, set this on Railway:

```env
DEV_GUILD_ID=YOUR_TEST_SERVER_ID
```

Run from a local clone or Railway shell:

```bash
cd backend
npm run deploy-commands
```

For global registration, remove `DEV_GUILD_ID` and run the command again. Global command propagation can take longer than guild command registration.

You may instead set `REGISTER_COMMANDS_ON_START=true` for one deployment, then return it to `false` to avoid unnecessary registrations on every restart.

## 7. Invite and permission checks

Invite ModerationDesk using Discord's application installation page or `/utility invite` after commands are registered.

The bot role must sit above every role and member it needs to manage. Anti-nuke requires **View Audit Log**. Test all destructive actions in a private server before production use.

## 8. Discord guild subscriptions

Create two **Guild Subscription** SKUs in Discord Developer Portal → **Monetization → Manage SKUs**. Guild subscriptions are applied to one server, so every member of that server's moderation team receives the plan.

| SKU | Price | Plan |
| --- | --- | --- |
| ModerationDesk Pro | $3.99/month | Advanced moderation and protection |
| ModerationDesk Pro+ | $7.99/month | Anti-nuke and continuity controls |

Publish both to **Store & API**, then add their IDs as Railway variables:

```env
DISCORD_PRO_SKU_ID=...
DISCORD_PRO_PLUS_SKU_ID=...
```

On startup and when Discord sends entitlement events, ModerationDesk reconciles the active entitlement for each server. Test the implementation with Discord test entitlements before public launch.

The exact storefront benefits and copy are in [`docs/DISCORD_GUILD_SUBSCRIPTIONS.md`](docs/DISCORD_GUILD_SUBSCRIPTIONS.md).

## 9. Production checks

Before launch, verify:

- Railway `/health` returns HTTP 200 and `ready: true`.
- The Railway service has one attached volume at `/data`.
- The Railway service has one replica.
- Vercel builds from `frontend`.
- `RAILWAY_BACKEND_URL` points to Railway over HTTPS.
- `FRONTEND_BASE_URL` points to the stable Vercel/custom domain.
- Both Discord OAuth redirects match exactly.
- Both Discord SKU IDs are present in Railway and the billing page links to the Discord Store.
- Cookies are HTTP-only and are set through the Vercel `/api` proxy.
- GitHub Actions passes both backend and frontend jobs.
- No secrets are committed.

## Storage note

The included store is atomic and persistent on a Railway volume, which is appropriate for a single-instance v1 deployment. Railway volumes cannot be mounted by multiple active replicas. Before introducing horizontal scaling or very high write volume, migrate the store to PostgreSQL or another shared transactional database.
