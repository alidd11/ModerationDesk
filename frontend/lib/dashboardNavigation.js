export const dashboardNavigation = [
  {
    label: 'Workspace',
    description: 'Monitor your server',
    items: [
      { id: 'overview', label: 'Overview', keywords: 'home health status' },
      { id: 'activity', label: 'Activity log', keywords: 'history audit timeline events' }
    ]
  },
  {
    label: 'Moderation',
    description: 'Review people and actions',
    items: [
      { id: 'cases', label: 'Cases', keywords: 'warnings punishments history' },
      { id: 'appeals', label: 'Appeals', keywords: 'member review decisions' },
      { id: 'policies', label: 'Warning actions', keywords: 'staff warnings timeout kick ban repeat behaviour ladder' }
    ]
  },
  {
    label: 'Protection',
    description: 'Automated safety controls',
    items: [
      { id: 'automod', label: 'AutoMod', keywords: 'automod spam invites links filters message rules' },
      { id: 'anti-raid', label: 'Anti-Raid', keywords: 'anti raid join gate quarantine', plan: 'Pro' },
      { id: 'anti-nuke', label: 'Anti-Nuke', keywords: 'anti nuke security destructive audit lockdown', plan: 'Pro+' }
    ]
  },
  {
    label: 'Configure',
    description: 'Access and server setup',
    items: [
      { id: 'verification', label: 'Verification', keywords: 'member access oauth button' },
      { id: 'staff-access', label: 'Staff permissions', keywords: 'moderators administrators permissions' },
      { id: 'roles', label: 'Role management', keywords: 'autoroles sticky roles member roles' },
      { id: 'commands', label: 'Commands', keywords: 'slash rename hide customise' },
      { id: 'logging', label: 'Action log', keywords: 'log channels events audit' },
      { id: 'member-messages', label: 'Welcome & goodbye', keywords: 'welcome goodbye greeting' }
    ]
  },
  {
    label: 'Community',
    description: 'Member-facing features',
    items: [
      { id: 'community', label: 'Community', keywords: 'suggestions polls giveaways starboard' }
    ]
  },
  {
    label: 'Manage',
    description: 'Plan and data controls',
    items: [
      { id: 'billing', label: 'Billing', keywords: 'subscription premium pro pro plus discord billing' },
      { id: 'data', label: 'Data & privacy', keywords: 'export delete appeal privacy' }
    ]
  }
];

export const dashboardSections = new Set(dashboardNavigation.flatMap(group => group.items.map(item => item.id)));
