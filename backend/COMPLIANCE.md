# Discord compliance and migration model

ModerationDesk does not use self-bots, user tokens, passwords, cookies captured from Discord, QR-login sessions or undocumented account automation.

The migration workflow is intentionally limited to role restoration:

1. The bot must be installed in both the source and destination servers.
2. The destination owner maps source role IDs to destination roles.
3. Each member joins the destination server independently using a normal Discord invite.
4. Each member initiates verification and authorizes the Discord `identify` OAuth scope.
5. ModerationDesk confirms the OAuth identity matches the member who clicked the verification button.
6. ModerationDesk checks whether that user is currently a member of the connected source server.
7. Eligible mapped roles are restored in the destination server.
8. OAuth access tokens are used for the immediate identity request and are not persisted.

The application does not request `guilds.join` during migration and does not call Discord's Add Guild Member endpoint. Server owners cannot consent on behalf of members.
