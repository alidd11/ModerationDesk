export const dashboardNavigation = [
  {
    label: 'Workspace',
    description: 'Monitor what is happening',
    items: [
      { id: 'overview', label: 'Overview', keywords: 'home health status' },
      { id: 'activity', label: 'Activity centre', keywords: 'history audit timeline events' }
    ]
  },
  {
    label: 'Moderation',
    description: 'Cases, appeals and policies',
    items: [
      { id: 'cases', label: 'Cases', keywords: 'warnings punishments history' },
      { id: 'appeals', label: 'Appeals', keywords: 'member review decisions' },
      { id: 'policies', label: 'Escalation policies', keywords: 'warnings timeout kick ban rules' }
    ]
  },
  {
    label: 'Protection',
    description: 'Automated server safety',
    items: [
      { id: 'automod', label: 'AutoMod', keywords: 'spam invites links filters' },
      { id: 'anti-raid', label: 'Join protection', keywords: 'anti raid join gate quarantine' },
      { id: 'anti-nuke', label: 'Anti-nuke', keywords: 'security destructive audit lockdown' }
    ]
  },
  {
    label: 'Server setup',
    description: 'Access, roles and configuration',
    items: [
      { id: 'verification', label: 'Verification', keywords: 'member access oauth button' },
      { id: 'staff-access', label: 'Staff access', keywords: 'moderators administrators permissions' },
      { id: 'roles', label: 'Roles & automation', keywords: 'autoroles sticky roles' },
      { id: 'commands', label: 'Commands', keywords: 'slash rename hide customise' },
      { id: 'logging', label: 'Logging', keywords: 'log channels events audit' },
      { id: 'member-messages', label: 'Member messages', keywords: 'welcome goodbye greeting' }
    ]
  },
  {
    label: 'Community',
    description: 'Member-facing tools',
    items: [
      { id: 'community', label: 'Community tools', keywords: 'suggestions polls giveaways starboard' }
    ]
  },
  {
    label: 'Account',
    description: 'Plan and data controls',
    items: [
      { id: 'billing', label: 'Plan & billing', keywords: 'subscription premium pro enterprise' },
      { id: 'data', label: 'Data & privacy', keywords: 'export delete appeal privacy' }
    ]
  }
];

export const dashboardSections = new Set(dashboardNavigation.flatMap(group => group.items.map(item => item.id)));
