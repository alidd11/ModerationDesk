# ModerationDesk Discord guild subscriptions

ModerationDesk sells one subscription per Discord server. Choose **Guild Subscription** for every paid SKU. It gives the purchased server's whole moderation team access to the plan.

## SKU 1 — ModerationDesk Pro

- Type: Guild Subscription
- Price: $3.99/month
- Description: Advanced moderation automation and proactive protection for one Discord server.

Benefits (use these six in Discord's SKU editor):

1. Advanced message screening — Per-rule deletion, warning and timeout responses.
2. Anti-raid and Join Gate — Detect join spikes and screen risky new accounts.
3. Verified access — Discord OAuth verification and web appeals.
4. Precise audit routing — Send each moderation and security event to the right staff channel.
5. Flexible roles — Sticky roles, starboard and up to ten auto roles.
6. Faster moderation setup — Saved protection presets and policy controls.

## SKU 2 — ModerationDesk Pro Plus

- Type: Guild Subscription
- Price: $7.99/month
- Description: High-confidence security and community continuity for one Discord server.

Benefits (use these six in Discord's SKU editor):

1. Everything in ModerationDesk Pro.
2. Anti-nuke containment — Respond to destructive audit activity with a configured policy.
3. Recovery controls — Restore deleted channels and roles when configured.
4. Migration continuity — Consent-based migration verification for existing members.
5. Role restoration — Restore mapped roles after a verified migration.
6. Full protection controls — Higher limits and all advanced security policy settings.

## Publish and connect

1. In Discord Developer Portal, open **Monetization → Manage SKUs** for ModerationDesk.
2. Create both SKUs using the details above, add the brand image, then publish them to **Store & API**.
3. Copy each SKU ID after creation.
4. In Railway, add these service variables:

   ```text
   DISCORD_PRO_SKU_ID=<ModerationDesk Pro SKU ID>
   DISCORD_PRO_PLUS_SKU_ID=<ModerationDesk Pro Plus SKU ID>
   ```

5. Redeploy Railway. ModerationDesk will reconcile active Discord entitlements when it starts and when Discord sends entitlement create, update or delete events.
6. Test both plans with a Discord test entitlement before announcing the store publicly.

The dashboard and `/premium` command use Discord Store links once both SKU IDs are configured. Discord entitlements—not a payment-webhook flag—remain the source of truth for plan access.
