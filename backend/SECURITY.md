# Security

- Never commit `.env`, bot tokens, client secrets, Stripe keys or admin keys.
- Rotate any secret that appears in logs, screenshots, repositories or support messages.
- Use HTTPS for all public deployments.
- Keep `SESSION_SECRET` and `PREMIUM_ADMIN_KEY` separate and at least 32 random characters.
- Restrict the protected admin API at the network layer where possible.
- Give the bot only the permissions it needs and keep its role below the server owner but above roles it manages.
- Anti-nuke depends on Discord audit-log availability and role hierarchy. Test it in a private server.
- Keep dependencies updated and run `npm audit` and `npm run verify` before deployment.
- Back up the persistent `DATA_DIR` volume.

Report security issues privately through the operator's configured support route rather than a public Discord channel.
