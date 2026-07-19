export const dashboardNavigation = [
  {
    label: 'Home',
    description: 'Your server at a glance',
    items: [
      { id: 'overview', label: 'Overview', keywords: 'home health status' },
      { id: 'activity', label: 'Activity log', keywords: 'history audit timeline events' }
    ]
  },
  {
    label: 'Moderation',
    description: 'People, cases and policies',
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
      { id: 'automod', label: 'AutoMod', keywords: 'automod spam invites links filters message rules' },
      { id: 'anti-raid', label: 'Anti-Raid', keywords: 'anti raid join gate quarantine', plan: 'Pro' },
      { id: 'anti-nuke', label: 'Anti-Nuke', keywords: 'anti nuke security destructive audit lockdown', plan: 'Pro+' }
    ]
  },
  {
    label: 'Server setup',
    description: 'Access, behaviour and integrations',
    items: [
      { id: 'verification', label: 'Verification', keywords: 'member access oauth button' },
      { id: 'staff-access', label: 'Staff access', keywords: 'moderators administrators permissions' },
      { id: 'roles', label: 'Roles & automation', keywords: 'autoroles sticky roles member roles' },
      { id: 'commands', label: 'Commands', keywords: 'slash rename hide customise' },
      { id: 'migration', label: 'Migration', keywords: 'server move role restore oauth continuity', plan: 'Pro+' },
      { id: 'logging', label: 'Logging', keywords: 'log channels events audit' },
      { id: 'member-messages', label: 'Welcome & goodbye', keywords: 'welcome goodbye greeting' },
      { id: 'community', label: 'Community tools', keywords: 'suggestions polls giveaways starboard' }
    ]
  },
  {
    label: 'Account',
    description: 'Plan and data controls',
    items: [
      { id: 'billing', label: 'Billing', keywords: 'subscription premium pro pro plus discord billing' },
      { id: 'data', label: 'Data & privacy', keywords: 'export delete appeal privacy' }
    ]
  }
];

export const dashboardSections = new Set(dashboardNavigation.flatMap(group => group.items.map(item => item.id)));
