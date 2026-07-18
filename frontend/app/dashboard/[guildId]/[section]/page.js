import GuildDashboardPage from '../page';

const validSections = new Set(['overview', 'activity', 'cases', 'appeals', 'staff-access', 'commands', 'logging', 'member-messages', 'roles', 'community', 'automod', 'anti-raid', 'anti-nuke', 'verification', 'billing', 'data']);

export default async function DashboardSectionPage({ params }) {
  const { section } = await params;
  return <GuildDashboardPage initialSection={validSections.has(section) ? section : 'overview'} />;
}
