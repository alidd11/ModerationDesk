# ModerationDesk backend

Long-running Discord bot and JSON API intended for Railway.

Deployment configuration is defined in `railway.json`. The service binds to Railway's injected `PORT`, exposes `/health`, detects `RAILWAY_VOLUME_MOUNT_PATH`, and stores web sessions and OAuth state in the persistent data store.

Use the repository-level `DEPLOYMENT.md` for setup.
