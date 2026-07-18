import Shell from '../../components/Shell';

export const metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return <Shell compact><article className="legal"><span className="section-kicker">LEGAL</span><h1>Privacy policy</h1><p className="legal-date">Last updated 18 July 2026</p><h2>What ModerationDesk stores</h2><p>ModerationDesk stores the server configuration and operational records needed to provide moderation, security, verification, appeals and migration features. This can include Discord user IDs, server IDs, role and channel IDs, moderation cases and submitted appeals.</p><h2>Discord authentication</h2><p>Dashboard access uses Discord OAuth. ModerationDesk never requests a password, user token or cookie. OAuth verification and migration remain consent-based.</p><h2>How data is used</h2><p>Data is used only to operate and secure the service, provide requested features and support server administrators. It is not sold.</p><h2>Control and deletion</h2><p>Authorised server administrators can export or delete their server’s stored data from the dashboard. For account or privacy enquiries, contact support@moderationdesk.com.</p></article></Shell>;
}
