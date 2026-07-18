# Privacy implementation notes

ModerationDesk stores server configuration and operational moderation records required to provide its features. Depending on enabled features, records can include Discord user IDs, moderator IDs, reasons, case numbers, warning records, moderator notes, appeal text, migration completion records and billing identifiers.

OAuth access tokens are not stored. Dashboard sessions are held in process memory for up to eight hours and use HTTP-only, SameSite cookies. Verification requests use short-lived one-time state values.

Server administrators can export stored server data through `/config export` or the dashboard. Administrators can delete stored server data through the dashboard or protected admin API. This does not delete messages, roles or audit records held by Discord.

Before public launch, publish a privacy policy and terms URL using `PRIVACY_URL` and `TERMS_URL`, identify the legal operator and contact route, define retention periods, and document how users can request access or deletion where applicable.
