export const productAreas = [
  {
    id: 'overview',
    number: '01',
    label: 'Overview',
    kicker: 'Control centre',
    title: 'See the state of your server before you make a change.',
    description: 'ModerationDesk brings configuration, permission health, protection status and recent staff activity into one clear operating view.',
    capabilities: [
      ['Configuration progress', 'See which essential modules are ready and which still need attention.'],
      ['Permission health', 'Check whether the bot can carry out the actions each module requires.'],
      ['Protection status', 'Review AutoMod, anti-raid, anti-nuke and verification independently.'],
      ['Recent activity', 'Move from a headline event into its case, appeal or audit record.']
    ],
    steps: ['Choose a server you manage', 'Review its setup and permission checks', 'Open the module that needs attention'],
    outcome: 'Server owners get one reliable starting point instead of checking commands, roles and log channels separately.'
  },
  {
    id: 'moderation',
    number: '02',
    label: 'Moderation',
    kicker: 'Accountable staff actions',
    title: 'Keep every moderation decision attached to a clear record.',
    description: 'Warnings, timeouts, bans, notes and appeal decisions stay linked to the member, the staff member and the reason for the action.',
    capabilities: [
      ['Cases and history', 'Review previous actions before deciding what should happen next.'],
      ['Warnings and notes', 'Separate member-facing warnings from private staff context.'],
      ['Temporary actions', 'Run timed punishments with an expiry the team can see.'],
      ['Appeal records', 'Keep submissions and staff decisions connected to the original case.']
    ],
    steps: ['Take action from Discord or the dashboard', 'Record the reason and supporting context', 'Review or resolve the case as a team'],
    outcome: 'Staff decisions remain consistent, explainable and available for later review.'
  },
  {
    id: 'protection',
    number: '03',
    label: 'Protection',
    kicker: 'Layered server security',
    title: 'Tune routine filters and serious attack protection separately.',
    description: 'AutoMod, anti-raid and anti-nuke use their own thresholds, exemptions and enforcement actions, so one broad switch never hides what is happening.',
    capabilities: [
      ['Message filters', 'Control spam, duplicates, mentions, invites, links and blocked terms.'],
      ['Join protection', 'Detect unusual member spikes and apply a measured lockdown response.'],
      ['Destructive actions', 'Monitor dangerous channel, role, webhook and permission changes.'],
      ['Clear exemptions', 'Exclude trusted roles and channels without weakening unrelated controls.']
    ],
    steps: ['Set everyday AutoMod rules', 'Choose raid thresholds and lockdown behaviour', 'Reserve anti-nuke for high-risk actions'],
    outcome: 'Teams can identify which protection layer acted, why it acted and what it changed.'
  },
  {
    id: 'access',
    number: '04',
    label: 'Access',
    kicker: 'Verification and roles',
    title: 'Control member access without unsafe account shortcuts.',
    description: 'Use button or Discord OAuth verification, manage member roles and restore approved roles during a community migration with individual consent.',
    capabilities: [
      ['Button verification', 'Give new members a simple in-server route to their verified role.'],
      ['Discord OAuth', 'Confirm identity through Discord without collecting passwords or user tokens.'],
      ['Role continuity', 'Apply autoroles and restore selected roles where the server has mapped them.'],
      ['Consent-based migration', 'Help members move communities without silently adding their accounts.']
    ],
    steps: ['Choose the verification method', 'Select verified and restricted roles', 'Publish the member-facing verification route'],
    outcome: 'Member access remains understandable to administrators and compliant with Discord’s permission model.'
  },
  {
    id: 'operations',
    number: '05',
    label: 'Operations',
    kicker: 'Day-to-day control',
    title: 'Keep the supporting work in the same control room.',
    description: 'Manage staff access, event logging, member messages and common community workflows without adding another collection of disconnected bots.',
    capabilities: [
      ['Staff access', 'Choose multiple moderator and administrator roles for the dashboard.'],
      ['Structured logging', 'Route moderation, security, message and member events by purpose.'],
      ['Member messages', 'Configure useful welcome and goodbye messages with server variables.'],
      ['Community tools', 'Run suggestions, public appeals and starboard workflows together.']
    ],
    steps: ['Define who can manage the server', 'Route important events to the right channels', 'Enable only the community tools you use'],
    outcome: 'Owners have fewer integrations to maintain and staff have fewer places to check.'
  },
  {
    id: 'setup',
    number: '06',
    label: 'Setup',
    kicker: 'From invite to working server',
    title: 'Configure ModerationDesk with real Discord roles and channels.',
    description: 'Add the bot, sign in with Discord and configure each module using the roles, channels and permissions already available in your server.',
    capabilities: [
      ['Guided connection', 'Choose a server where you have Manage Server permission.'],
      ['Real Discord data', 'Select roles and channels by name instead of copying IDs.'],
      ['Module-by-module setup', 'Start with staff access and logs before enabling protection.'],
      ['Data controls', 'Export the server record or remove stored configuration when required.']
    ],
    steps: ['Add ModerationDesk to Discord', 'Open the server from your dashboard', 'Complete staff, logging and protection setup'],
    outcome: 'A server can start small and add stronger controls without rebuilding its setup.'
  }
];

export function getProductArea(id) {
  return productAreas.find(area => area.id === id);
}
