# ModerationDesk 1.1 deployment build

## Architecture

- Railway: Discord gateway, Express API, OAuth callbacks, scheduled actions, billing webhook and persistent store.
- Vercel: Next.js public website, multi-guild dashboard and appeal interface.
- Same-origin API access: Vercel rewrites `/api/*` to Railway.

## Validation completed

- Backend JavaScript syntax validation: passed.
- Discord application command serialization: 13 command groups passed.
- Backend automated tests: 7 passed.
- Backend production dependency audit: 0 vulnerabilities.
- Frontend Next.js production build: passed.
- Frontend production dependency audit: 0 vulnerabilities.
- GitHub Actions CI included for both projects.

## Deployment controls included

- Railway config-as-code with health check and restart policy.
- Railway volume auto-detection.
- Persistent OAuth states and web sessions.
- HTTP-only signed session cookie.
- CSRF enforcement on dashboard mutations.
- Same-origin Vercel API proxy.
- Explicit Discord OAuth callback paths.
- Security headers on both services.
- Graceful Railway shutdown handling.
