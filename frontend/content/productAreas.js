export const productAreas = [
  {
    id: 'overview',
    number: '01',
    label: 'Overview',
    kicker: 'Control centre',
    title: 'See what needs attention before you change anything.',
    description: 'Check setup, permissions, protection and recent staff activity from one clear starting point.',
    capabilities: [
      ['Configuration progress', 'See which essential modules are ready and which still need attention.'],
      ['Permission health', 'Check whether the bot can carry out the actions each module requires.'],
      ['Protection status', 'Review AutoMod, anti-raid, anti-nuke and verification independently.'],
      ['Recent activity', 'Move from a headline event into its case, appeal or audit record.']
    ],
    steps: ['Choose a server you manage', 'Review its setup and permission checks', 'Open the module that needs attention'],
    outcome: 'Start with the full picture instead of checking commands, roles and log channels separately.'
  },
  {
    id: 'moderation',
    number: '02',
    label: 'Moderation',
    kicker: 'Accountable staff actions',
    title: 'Keep every moderation decision attached to its record.',
    description: 'Warnings, timeouts, bans, notes and appeals stay connected to the member, staff member and reason.',
    capabilities: [
      ['Cases and history', 'Review previous actions before deciding what should happen next.'],
      ['Warnings and notes', 'Separate member-facing warnings from private staff context.'],
      ['Temporary actions', 'Run timed punishments with an expiry the team can see.'],
      ['Appeal records', 'Keep submissions and staff decisions connected to the original case.']
    ],
    steps: ['Take action from Discord or the dashboard', 'Record the reason and supporting context', 'Review or resolve the case as a team'],
    outcome: 'Staff decisions stay consistent, explainable and easy to review later.'
  },
  {
    id: 'protection',
    number: '03',
    label: 'Protection',
    kicker: 'Layered server security',
    title: 'Set everyday filters and serious protection separately.',
    description: 'AutoMod, Anti-Raid and Anti-Nuke each have their own rules, exemptions and actions, so you always know what is running.',
    capabilities: [
      ['Message filters', 'Control spam, duplicates, mentions, invites, links and blocked terms.'],
      ['Join protection', 'Detect unusual member spikes and apply a measured lockdown response.'],
      ['Destructive actions', 'Monitor dangerous channel, role, webhook and permission changes.'],
      ['Clear exemptions', 'Exclude trusted roles and channels without weakening unrelated controls.']
    ],
    steps: ['Set everyday AutoMod rules', 'Choose raid thresholds and lockdown behaviour', 'Reserve anti-nuke for high-risk actions'],
    outcome: 'Teams can see which protection acted, why it acted and what it changed.'
  },
  {
    id: 'access',
    number: '04',
    label: 'Access',
    kicker: 'Verification and roles',
    title: 'Control member access without unsafe shortcuts.',
    description: 'Use button or Discord OAuth verification, manage member roles and restore approved roles during a consent-based migration.',
    capabilities: [
      ['Button verification', 'Give new members a simple in-server route to their verified role.'],
      ['Discord OAuth', 'Confirm identity through Discord without collecting passwords or user tokens.'],
      ['Role continuity', 'Apply autoroles and restore selected roles where the server has mapped them.'],
      ['Consent-based migration', 'Help members move communities without silently adding their accounts.']
    ],
    steps: ['Choose the verification method', 'Select verified and restricted roles', 'Publish the member-facing verification route'],
    outcome: 'Member access stays clear for administrators and compliant with Discord’s permission model.'
  },
  {
    id: 'operations',
    number: '05',
    label: 'Operations',
    kicker: 'Day-to-day control',
    title: 'Keep the supporting work in the same place.',
    description: 'Manage staff access, event logging, member messages and community tools without adding more disconnected bots.',
    capabilities: [
      ['Staff access', 'Choose multiple moderator and administrator roles for the dashboard.'],
      ['Structured logging', 'Route moderation, security, message and member events by purpose.'],
      ['Member messages', 'Configure useful welcome and goodbye messages with server variables.'],
      ['Community tools', 'Run suggestions, public appeals and starboard workflows together.']
    ],
    steps: ['Define who can manage the server', 'Route important events to the right channels', 'Enable only the community tools you use'],
    outcome: 'Owners maintain fewer integrations and staff have fewer places to check.'
  },
  {
    id: 'setup',
    number: '06',
    label: 'Setup',
    kicker: 'From invite to working server',
    title: 'Configure ModerationDesk with the roles and channels you already use.',
    description: 'Add the bot, sign in with Discord and set up each module with your existing server roles, channels and permissions.',
    capabilities: [
      ['Guided connection', 'Choose a server where you have Manage Server permission.'],
      ['Real Discord data', 'Select roles and channels by name instead of copying IDs.'],
      ['Module-by-module setup', 'Start with staff access and logs before enabling protection.'],
      ['Data controls', 'Export the server record or remove stored configuration when required.']
    ],
    steps: ['Add ModerationDesk to Discord', 'Open the server from your dashboard', 'Complete staff, logging and protection setup'],
    outcome: 'Start small, then add stronger controls without rebuilding your setup.'
  }
];

export function getProductArea(id) {
  return productAreas.find(area => area.id === id);
}
