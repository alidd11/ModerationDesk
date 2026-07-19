export const dashboardNavigation = [
  {
    label: 'Workspace',
    description: 'Monitor your server',
    items: [
      { id: 'overview', label: 'Overview', keywords: 'home health status' },
      { id: 'activity', label: 'Activity centre', keywords: 'history audit timeline events' }
    ]
  },
  {
    label: 'Moderation',
    description: 'Review people and actions',
    items: [
      { id: 'cases', label: 'Cases', keywords: 'warnings punishments history' },
      { id: 'appeals', label: 'Appeals', keywords: 'member review decisions' },
      { id: 'policies', label: 'Escalation policy', keywords: 'staff warnings timeout kick ban repeat behaviour ladder' }
    ]
  },
  {
    label: 'Protection',
    description: 'Automated safety controls',
    items: [
      { id: 'automod', label: 'Message protection', keywords: 'automod spam invites links filters message rules' },
      { id: 'anti-raid', label: 'Join protection', keywords: 'anti raid join gate quarantine', plan: 'Pro' },
      { id: 'anti-nuke', label: 'Server protection', keywords: 'anti nuke security destructive audit lockdown', plan: 'Pro+' }
    ]
  },
  {
    label: 'Configure',
    description: 'Access and server setup',
    items: [
      { id: 'verification', label: 'Verification', keywords: 'member access oauth button' },
      { id: 'staff-access', label: 'Staff access', keywords: 'moderators administrators permissions' },
      { id: 'roles', label: 'Roles & automation', keywords: 'autoroles sticky roles member roles' },
      { id: 'commands', label: 'Commands', keywords: 'slash rename hide customise' },
      { id: 'logging', label: 'Logging', keywords: 'log channels events audit' },
      { id: 'member-messages', label: 'Member messages', keywords: 'welcome goodbye greeting' }
    ]
  },
  {
    label: 'Community',
    description: 'Member-facing features',
    items: [
      { id: 'community', label: 'Community tools', keywords: 'suggestions polls giveaways starboard' }
    ]
  },
  {
    label: 'Manage',
    description: 'Plan and data controls',
    items: [
      { id: 'billing', label: 'Plan & billing', keywords: 'subscription premium pro pro plus discord billing' },
      { id: 'data', label: 'Data & privacy', keywords: 'export delete appeal privacy' }
    ]
  }
];

export const dashboardSections = new Set(dashboardNavigation.flatMap(group => group.items.map(item => item.id)));
