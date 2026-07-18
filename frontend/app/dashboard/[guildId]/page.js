'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Shell from '../../../components/Shell';
import SettingsSection from '../../../components/SettingsSection';
import { Area, ChannelSelect, Check, Multi, RoleSelect, Select, Text } from '../../../components/Fields';
import { api } from '../../../lib/api';

const copy = value => JSON.parse(JSON.stringify(value));

const navigation = [
  { label: 'Overview', items: [{ id: 'overview', label: 'Overview' }] },
  {
    label: 'Moderation',
    items: [
      { id: 'cases', label: 'Cases' },
      { id: 'appeals', label: 'Appeals' }
    ]
  },
  {
    label: 'Protection',
    items: [
      { id: 'automod', label: 'AutoMod' },
      { id: 'anti-raid', label: 'Anti-raid' },
      { id: 'anti-nuke', label: 'Anti-nuke' }
    ]
  },
  {
    label: 'Access',
    items: [
      { id: 'verification', label: 'Verification' },
      { id: 'roles', label: 'Roles' },
      { id: 'staff-access', label: 'Staff access' }
    ]
  },
  {
    label: 'Community',
    items: [
      { id: 'member-messages', label: 'Member messages' },
      { id: 'community', label: 'Community tools' }
    ]
  },
  {
    label: 'System',
    items: [
      { id: 'commands', label: 'Commands' },
      { id: 'logging', label: 'Logging' },
      { id: 'billing', label: 'Billing' },
      { id: 'data', label: 'Data & privacy' }
    ]
  }
];

const validSections = new Set(navigation.flatMap(group => group.items.map(item => item.id)));
const LOG_EVENT_OPTIONS = { moderation: [['member_warned', 'Warnings'], ['member_kicked', 'Kicks'], ['member_banned', 'Bans']], security: [['automod_action', 'AutoMod actions'], ['anti_raid_triggered', 'Anti-raid triggers'], ['anti_nuke_triggered', 'Anti-nuke triggers']], messages: [['message_deleted', 'Deleted messages'], ['messages_bulk_deleted', 'Bulk deleted messages'], ['message_edited', 'Edited messages']], member: [['member_joined', 'Member joins'], ['member_left_or_was_removed', 'Member leaves'], ['member_updated', 'Member and role changes']], server: [['channel_created', 'Channels created'], ['channel_deleted', 'Channels deleted'], ['role_created', 'Roles created'], ['role_deleted', 'Roles deleted']], appeals: [['appeal_submitted', 'Appeals submitted'], ['appeal_resolved', 'Appeals resolved']] };

const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const formatDate = value => value ? dateFormatter.format(new Date(value)) : '—';
const titleCase = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function Status({ enabled, children }) {
  return <span className={`feature-status ${enabled ? 'enabled' : ''}`}><i aria-hidden="true" />{children}</span>;
}

export default function GuildDashboardPage({ initialSection = 'overview' }) {
  const { guildId } = useParams();
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [guild, setGuild] = useState(null);
  const [drafts, setDrafts] = useState(null);
  const [records, setRecords] = useState({ cases: [], appeals: [] });
  const [activeSection, setActiveSection] = useState(initialSection);
  const [openGroups, setOpenGroups] = useState({ Overview: true, Moderation: false, Protection: false, Access: false, Community: false, System: false });
  const [error, setError] = useState('');
  const [danger, setDanger] = useState('');
  const [billingBusy, setBillingBusy] = useState(false);
  const [activeLogGroup, setActiveLogGroup] = useState('moderation');

  useEffect(() => {
    Promise.all([
      api('/api/auth/session'),
      api(`/api/guilds/${guildId}`),
      api(`/api/guilds/${guildId}/cases?limit=50`),
      api(`/api/guilds/${guildId}/appeals`)
    ])
      .then(([sessionData, guildData, caseData, appealData]) => {
        setSession(sessionData);
        setGuild(guildData.guild);
        setRecords({ cases: caseData.cases, appeals: appealData.appeals });
        const cfg = guildData.guild.config;
        setDrafts({
          general: {
            staffRoleIds: cfg.staffRoleIds,
            adminRoleIds: cfg.adminRoleIds,
            logs: cfg.logs,
            logEvents: cfg.logEvents || Object.fromEntries(Object.keys(LOG_EVENT_OPTIONS).map(key => [key, []])),
            welcome: cfg.welcome,
            goodbye: cfg.goodbye,
            autoroles: cfg.autoroles,
            stickyRoles: cfg.stickyRoles,
            suggestions: cfg.suggestions,
            starboard: cfg.starboard,
            appeals: cfg.appeals
          },
          automod: {
            ...cfg.automod,
            blockedWords: cfg.automod.blockedWords.join('\n'),
            allowedDomains: cfg.automod.allowedDomains.join('\n'),
            allowedInviteCodes: cfg.automod.allowedInviteCodes.join('\n')
          },
          security: cfg.security,
          verification: cfg.verification,
          commands: cfg.commandSettings || { overrides: {}, syncedAt: '' }
        });
      })
      .catch(error => setError(error.status === 401 ? 'Sign in to manage this server.' : error.message));
  }, [guildId]);

  useEffect(() => {
    const syncSection = () => {
    const pathSection = pathname.split('/')[3] || initialSection;
    const requested = window.location.hash.slice(1) || pathSection;
    setActiveSection(validSections.has(requested) ? requested : 'overview');
    };

    syncSection();
    window.addEventListener('hashchange', syncSection);
    return () => window.removeEventListener('hashchange', syncSection);
  }, [pathname, initialSection]);

  useEffect(() => {
    const group = navigation.find(item => item.items.some(section => section.id === activeSection))?.label || 'Overview';
    setOpenGroups(current => ({ ...current, [group]: true }));
  }, [activeSection]);

  const set = (section, updater) => setDrafts(current => ({ ...current, [section]: updater(copy(current[section])) }));
  const plan = guild?.config?.plan || 'free';

  async function billing(path, body = {}) {
    setBillingBusy(true);
    try {
      const result = await api(`/api/guilds/${guildId}/billing/${path}`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': session.csrf },
        body: JSON.stringify(body)
      });
      window.location.href = result.url;
    } catch (error) {
      setError(error.message);
      setBillingBusy(false);
    }
  }

  async function deleteData() {
    try {
      await api(`/api/guilds/${guildId}/data`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': session.csrf },
        body: JSON.stringify({ confirmation: danger })
      });
      window.location.href = '/dashboard';
    } catch (error) {
      setError(error.message);
    }
  }

  if (error && !guild) {
    return <Shell wide><section className="section"><div className="error">{error}</div><p><a className="button" href={`/api/auth/login?returnTo=/dashboard/${guildId}`}>Sign in with Discord</a></p></section></Shell>;
  }

  if (!guild || !drafts || !session) {
    return <Shell wide><section className="section"><div className="card skeleton">Loading server configuration…</div></section></Shell>;
  }

  const channels = guild.channels;
  const roles = guild.roles;
  const configuredLogs = Object.values(drafts.general.logs).filter(Boolean).length;
  const stats = guild.config.stats;
  const health = guild.health || { connected: true, permissions: [], granted: 0, total: 0, highestRole: '' };
  const openAppeals = records.appeals.filter(appeal => appeal.status === 'open');
  const setupSignals = [
    drafts.general.staffRoleIds.length > 0,
    configuredLogs > 0,
    drafts.automod.enabled,
    drafts.security.antiRaid.enabled || drafts.security.antiNuke.enabled,
    drafts.verification.enabled
  ];
  const setupProgress = Math.round((setupSignals.filter(Boolean).length / setupSignals.length) * 100);
  const sectionStatuses = {
    cases: records.cases.length > 0,
    appeals: openAppeals.length > 0,
    'staff-access': drafts.general.staffRoleIds.length > 0,
    logging: configuredLogs > 0,
    'member-messages': drafts.general.welcome.enabled || drafts.general.goodbye.enabled,
    roles: drafts.general.autoroles.length > 0 || drafts.general.stickyRoles.enabled,
    community: drafts.general.suggestions.enabled || drafts.general.appeals.enabled || drafts.general.starboard.enabled,
    automod: drafts.automod.enabled,
    'anti-raid': drafts.security.antiRaid.enabled,
    'anti-nuke': drafts.security.antiNuke.enabled,
    verification: drafts.verification.enabled,
    billing: plan !== 'free'
  };

  return (
    <Shell wide>
      <div className="dashboard-shell">
        <div className="dashboard-breadcrumb"><a href="/dashboard">Servers</a><span aria-hidden="true">/</span><strong>{guild.name}</strong></div>
        <header className="dashboard-heading">
          <div className="guild-card">
            {guild.icon ? <img className="guild-icon" src={guild.icon} alt="" /> : <div className="guild-icon">{guild.name.slice(0, 2).toUpperCase()}</div>}
            <div className="grow">
              <span className="dashboard-kicker">Workspace</span>
              <h1>{guild.name}</h1>
              <p>{guild.memberCount.toLocaleString()} members <span className="header-separator">·</span> <span className="header-health"><i aria-hidden="true" />{health.connected ? 'Connected' : 'Offline'}</span></p>
            </div>
          </div>
          <div className="dashboard-heading-actions"><a className="button ghost small" href="/dashboard">Switch server</a><a className="button secondary small" href={`https://discord.com/channels/${guildId}`} target="_blank" rel="noreferrer">Open Discord <span aria-hidden="true">↗</span></a></div>
        </header>

        {error && <div className="error dashboard-error">{error}</div>}

        <div className="dashboard-layout">
          <aside className="sidebar" aria-label="Server settings">
            <label className="mobile-section-select">Dashboard section<select value={activeSection} onChange={event => { window.location.hash = event.target.value; setActiveSection(event.target.value); }}>{navigation.map(group => <optgroup label={group.label} key={group.label}>{group.items.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</optgroup>)}</select></label>
            {navigation.map(group => (
              <div className="sidebar-group" key={group.label}>
                <button className="sidebar-label sidebar-toggle" type="button" aria-expanded={Boolean(openGroups[group.label])} onClick={() => setOpenGroups(current => ({ ...current, [group.label]: !current[group.label] }))}><span>{group.label}</span><i aria-hidden="true">{openGroups[group.label] ? '−' : '+'}</i></button>
                {openGroups[group.label] && <nav aria-label={`${group.label} settings`}>
                  {group.items.map(item => (
                    <a
                      className={activeSection === item.id ? 'active' : ''}
                      href={`/${guildId ? `dashboard/${guildId}/` : 'dashboard/'}${item.id}`}
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      aria-current={activeSection === item.id ? 'page' : undefined}
                    >
                      <span>{item.label}</span>
                      <span className="nav-meta"><b className={`nav-dot ${sectionStatuses[item.id] ? 'enabled' : ''}`} aria-hidden="true" /><i aria-hidden="true">›</i></span>
                    </a>
                  ))}
                </nav>}
              </div>
            ))}
          </aside>

          <div className="dashboard-content">
            {activeSection === 'overview' && (
              <section className="card dashboard-overview" id="overview">
                <div className="settings-header">
                  <div><span className="settings-kicker">Overview</span><h2>Control centre</h2><p>Live configuration, bot health and recorded moderation activity for this server.</p></div>
                  <div className="setup-score"><span>{setupProgress}%</span><small>configured</small></div>
                </div>
                <div className="settings-body">
                  <div className="overview-stats operational">
                    <article><span>AutoMod actions</span><strong>{Number(stats.automodActions || 0).toLocaleString()}</strong><small>Recorded interventions</small></article>
                    <article><span>Verified members</span><strong>{Number(stats.verified || 0).toLocaleString()}</strong><small>Completed verification</small></article>
                    <article><span>Raid triggers</span><strong>{Number(stats.raidTriggers || 0).toLocaleString()}</strong><small>Join spikes detected</small></article>
                    <article><span>Open appeals</span><strong>{openAppeals.length.toLocaleString()}</strong><small>Awaiting staff review</small></article>
                  </div>

                  <div className="overview-columns">
                    <div className="overview-panel stack-panel">
                      <div className="panel-heading"><div><h3>Bot health</h3><p>Discord permissions available to ModerationDesk.</p></div><Status enabled={health.connected}>{health.connected ? 'Connected' : 'Offline'}</Status></div>
                      <div className="health-summary"><strong>{health.granted} / {health.total}</strong><span>required permissions granted</span></div>
                      <div className="permission-grid">
                        {health.permissions.map(permission => <span key={permission.name} className={permission.granted ? 'granted' : 'missing'}><i aria-hidden="true">{permission.granted ? '✓' : '!'}</i>{permission.name}</span>)}
                      </div>
                      {health.total > 0 && health.granted !== health.total && <div className="notice">Some features may fail until the missing Discord permissions are restored.</div>}
                    </div>

                    <div className="overview-panel stack-panel">
                      <div className="panel-heading"><div><h3>Protection status</h3><p>Each layer is configured independently.</p></div><span className="badge">{plan}</span></div>
                      <div className="module-status-list">
                        <a href="#automod" onClick={() => setActiveSection('automod')}><span><b>AutoMod</b><small>Message filters and automatic sanctions</small></span><Status enabled={drafts.automod.enabled}>{drafts.automod.enabled ? 'Enabled' : 'Disabled'}</Status></a>
                        <a href="#anti-raid" onClick={() => setActiveSection('anti-raid')}><span><b>Anti-raid</b><small>Join-spike detection and quarantine</small></span><Status enabled={drafts.security.antiRaid.enabled}>{drafts.security.antiRaid.enabled ? 'Enabled' : 'Disabled'}</Status></a>
                        <a href="#anti-nuke" onClick={() => setActiveSection('anti-nuke')}><span><b>Anti-nuke</b><small>Destructive-action response</small></span><Status enabled={drafts.security.antiNuke.enabled}>{drafts.security.antiNuke.enabled ? 'Enabled' : 'Disabled'}</Status></a>
                        <a href="#verification" onClick={() => setActiveSection('verification')}><span><b>Verification</b><small>Controlled member access</small></span><Status enabled={drafts.verification.enabled}>{drafts.verification.enabled ? 'Enabled' : 'Disabled'}</Status></a>
                      </div>
                    </div>
                  </div>

                  <div className="overview-columns lower">
                    <div className="overview-panel stack-panel">
                      <div className="panel-heading"><div><h3>Recent cases</h3><p>The latest actions recorded by the moderation system.</p></div><a href="#cases" onClick={() => setActiveSection('cases')}>View all</a></div>
                      <div className="compact-records">
                        {records.cases.slice(0, 4).map(item => <div key={item.id}><span className="record-index">#{item.id}</span><span><b>{titleCase(item.action)}</b><small>{item.reason || 'No reason supplied'}</small></span><time>{formatDate(item.createdAt)}</time></div>)}
                        {!records.cases.length && <div className="empty-state compact"><strong>No cases recorded</strong><span>Moderation actions will appear here as staff use ModerationDesk.</span></div>}
                      </div>
                    </div>
                    <div className="overview-panel stack-panel">
                      <div className="panel-heading"><div><h3>Setup checklist</h3><p>Core configuration for a working moderation setup.</p></div><strong>{setupSignals.filter(Boolean).length}/{setupSignals.length}</strong></div>
                      <div className="setup-progress"><i style={{ width: `${setupProgress}%` }} /></div>
                      <div className="setup-checks">
                        <a href="#staff-access" onClick={() => setActiveSection('staff-access')}><span>Staff access</span><Status enabled={drafts.general.staffRoleIds.length > 0}>{drafts.general.staffRoleIds.length ? 'Configured' : 'Required'}</Status></a>
                        <a href="#logging" onClick={() => setActiveSection('logging')}><span>Logging</span><Status enabled={configuredLogs > 0}>{configuredLogs ? `${configuredLogs} channels` : 'Required'}</Status></a>
                        <a href="#automod" onClick={() => setActiveSection('automod')}><span>AutoMod</span><Status enabled={drafts.automod.enabled}>{drafts.automod.enabled ? 'Enabled' : 'Optional'}</Status></a>
                        <a href="#verification" onClick={() => setActiveSection('verification')}><span>Verification</span><Status enabled={drafts.verification.enabled}>{drafts.verification.enabled ? 'Enabled' : 'Optional'}</Status></a>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'cases' && (
              <section className="card settings-section" id="cases">
                <div className="settings-header"><div><span className="settings-kicker">Activity</span><h2>Cases</h2><p>The latest moderation actions recorded for this server.</p></div><span className="record-count">{records.cases.length} shown</span></div>
                <div className="settings-body record-section">
                  <div className="workspace-summary moderation-summary"><div><span className="workspace-summary-label">Recorded cases</span><strong>{records.cases.length}</strong><p>Recent moderation actions available in this workspace.</p></div><div><span className="workspace-summary-label">Active</span><strong>{records.cases.filter(item => item.active !== false).length}</strong><p>Cases still open in the audit trail.</p></div><div><span className="workspace-summary-label">Latest action</span><strong>{records.cases[0] ? titleCase(records.cases[0].action) : 'None yet'}</strong><p>{records.cases[0] ? formatDate(records.cases[0].createdAt) : 'Actions will appear here.'}</p></div></div>
                  {records.cases.length ? <div className="record-table-wrap"><table className="record-table"><thead><tr><th>Case</th><th>Member</th><th>Action</th><th>Reason</th><th>Date</th><th>Status</th></tr></thead><tbody>{records.cases.map(item => <tr key={item.id}><td className="record-index">#{item.id}</td><td className="mono">{item.userId || '—'}</td><td><strong>{titleCase(item.action)}</strong></td><td className="record-reason">{item.reason || 'No reason supplied'}</td><td><time>{formatDate(item.createdAt)}</time></td><td><span className={`record-status ${item.active === false ? 'closed' : ''}`}>{item.active === false ? 'Voided' : 'Active'}</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>No cases recorded yet</strong><p>Warnings, timeouts, kicks and bans created through ModerationDesk will appear here.</p></div>}
                </div>
              </section>
            )}

            {activeSection === 'appeals' && (
              <section className="card settings-section" id="appeals">
                <div className="settings-header"><div><span className="settings-kicker">Activity</span><h2>Appeals</h2><p>Review the appeal records submitted through the public Discord OAuth form.</p></div><span className="record-count">{openAppeals.length} open</span></div>
                <div className="settings-body record-section">
                  <div className="data-action appeal-page-link"><div><h3>Public appeal form</h3><p>Share this page with members who need to appeal a moderation action.</p></div><a className="button ghost small" href={guild.appealUrl} target="_blank" rel="noreferrer">Open public page</a></div>
                  {records.appeals.length ? <div className="record-table-wrap appeals-table"><table className="record-table"><thead><tr><th>Appeal</th><th>Member</th><th>Case</th><th>Reason</th><th>Submitted</th><th>Status</th></tr></thead><tbody>{records.appeals.map(item => <tr key={item.id}><td className="record-index mono">{item.id}</td><td className="mono">{item.userId || '—'}</td><td>{item.caseId ? `#${item.caseId}` : '—'}</td><td className="record-reason">{item.reason || 'No reason supplied'}</td><td><time>{formatDate(item.createdAt)}</time></td><td><span className={`record-status ${item.status !== 'open' ? 'closed' : ''}`}>{titleCase(item.status)}</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>No appeals submitted</strong><p>New appeals will appear here when the public appeal form is enabled.</p></div>}
                </div>
              </section>
            )}

            {activeSection === 'staff-access' && (
              <SettingsSection id="staff-access" title="Staff access" description="Choose who can moderate the server and who can change protected settings." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
                <div className="form-grid">
                  <Multi label="Staff roles" help="Roles allowed to use staff-level commands." values={drafts.general.staffRoleIds} options={roles} onChange={value => set('general', data => (data.staffRoleIds = value, data))} />
                  <Multi label="Administrator roles" help="Roles allowed to change protected configuration." values={drafts.general.adminRoleIds} options={roles} onChange={value => set('general', data => (data.adminRoleIds = value, data))} />
                </div>
              </SettingsSection>
            )}

            {activeSection === 'commands' && (
              <SettingsSection id="commands" title="Commands" description="Rename, describe or hide ModerationDesk commands for this server. Changes are registered only in this Discord server." guildId={guildId} csrf={session.csrf} section="commands" data={drafts.commands}>
                <div className="command-customisation-list">
                  <div className="notice">Command names must be lowercase and use letters, numbers, hyphens or underscores. Subcommands stay the same, so your team can change the top-level wording without losing functionality.</div>
                  {Object.entries(drafts.commands.overrides).map(([key, value]) => (
                    <div className="command-customisation-row" key={key}>
                      <div><strong>/{key}</strong><small>Top-level command</small></div>
                      <Text label="Command name" value={value.name || key} onChange={next => set('commands', data => (data.overrides[key] = { ...data.overrides[key], name: next }, data))} />
                      <Text label="Description" value={value.description || ''} onChange={next => set('commands', data => (data.overrides[key] = { ...data.overrides[key], description: next }, data))} />
                      <Check label="Show in Discord" checked={value.enabled !== false} onChange={next => set('commands', data => (data.overrides[key] = { ...data.overrides[key], enabled: next }, data))} />
                    </div>
                  ))}
                </div>
              </SettingsSection>
            )}

            {activeSection === 'logging' && (
              <SettingsSection id="logging" title="Logging" description="Send each type of server activity to the right staff channel." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
                <div className="workspace-summary logging-summary"><div><span className="workspace-summary-label">Audit coverage</span><strong>{Object.values(drafts.general.logs).filter(Boolean).length}<small> / 6 routed</small></strong><p>Event families currently connected to a Discord channel.</p></div><div><span className="workspace-summary-label">Event types</span><strong>20+</strong><p>Member, message, server and moderation events.</p></div><div><span className="workspace-summary-label">Delivery</span><strong className={Object.values(drafts.general.logs).some(Boolean) ? 'summary-good' : 'summary-muted'}>{Object.values(drafts.general.logs).some(Boolean) ? 'Configured' : 'Not configured'}</strong><p>Logs are sent as staff-only embeds.</p></div></div>
                <div className="log-coverage-grid">{Object.entries({ moderation: ['Moderation', 'Warnings, bans, kicks and case actions.'], security: ['Security', 'AutoMod, raid and anti-nuke events.'], messages: ['Messages', 'Deleted, edited and bulk-deleted messages.'], member: ['Members', 'Joins, leaves and role changes.'], server: ['Server', 'Channel and role changes.'], appeals: ['Appeals', 'Submissions and decisions.'] }).map(([group, [label, description]]) => <button type="button" className={`log-coverage-card ${activeLogGroup === group ? 'selected' : ''}`} onClick={() => { setActiveLogGroup(group); document.getElementById(`log-${group}`)?.focus(); }} key={group}><strong>{label}</strong><span>{description}</span></button>)}</div>
                <div className="log-event-panel"><div><span className="workspace-summary-label">{activeLogGroup} events</span><p>Choose the actions routed to this category’s channel.</p></div><div className="log-event-options">{(LOG_EVENT_OPTIONS[activeLogGroup] || []).map(([key, label]) => <Check key={key} label={label} checked={drafts.general.logEvents[activeLogGroup]?.length === 0 || drafts.general.logEvents[activeLogGroup]?.includes(key)} onChange={checked => set('general', data => { const current = data.logEvents[activeLogGroup] || []; data.logEvents[activeLogGroup] = checked ? [...new Set([...current, key])] : current.filter(value => value !== key); return data; })} />)}</div></div>
                <div className="form-grid">
                  <ChannelSelect id="log-moderation" label="Moderation log" value={drafts.general.logs.moderation} channels={channels} onChange={value => set('general', data => (data.logs.moderation = value, data))} />
                  <ChannelSelect id="log-security" label="Security log" value={drafts.general.logs.security} channels={channels} onChange={value => set('general', data => (data.logs.security = value, data))} />
                  <ChannelSelect id="log-messages" label="Message log" value={drafts.general.logs.messages} channels={channels} onChange={value => set('general', data => (data.logs.messages = value, data))} />
                  <ChannelSelect id="log-server" label="Server log" value={drafts.general.logs.server} channels={channels} onChange={value => set('general', data => (data.logs.server = value, data))} />
                  <ChannelSelect id="log-member" label="Member log" value={drafts.general.logs.member} channels={channels} onChange={value => set('general', data => (data.logs.member = value, data))} />
                  <ChannelSelect id="log-appeals" label="Appeal log" value={drafts.general.logs.appeals} channels={channels} onChange={value => set('general', data => (data.logs.appeals = value, data))} />
                </div>
              </SettingsSection>
            )}

            {activeSection === 'member-messages' && (
              <SettingsSection id="member-messages" title="Member messages" description="Control the messages sent when members join or leave." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
                <div className="split-settings">
                  <div className="setting-block">
                    <h3>Welcome message</h3>
                    <Check label="Enable welcome messages" checked={drafts.general.welcome.enabled} onChange={value => set('general', data => (data.welcome.enabled = value, data))} />
                    <ChannelSelect label="Welcome channel" value={drafts.general.welcome.channelId} channels={channels} onChange={value => set('general', data => (data.welcome.channelId = value, data))} />
                    <Area label="Message" help="Supports {user}, {server} and {count}." value={drafts.general.welcome.message} onChange={value => set('general', data => (data.welcome.message = value, data))} />
                  </div>
                  <div className="setting-block">
                    <h3>Goodbye message</h3>
                    <Check label="Enable goodbye messages" checked={drafts.general.goodbye.enabled} onChange={value => set('general', data => (data.goodbye.enabled = value, data))} />
                    <ChannelSelect label="Goodbye channel" value={drafts.general.goodbye.channelId} channels={channels} onChange={value => set('general', data => (data.goodbye.channelId = value, data))} />
                    <Area label="Message" help="Supports {username} and {server}." value={drafts.general.goodbye.message} onChange={value => set('general', data => (data.goodbye.message = value, data))} />
                  </div>
                </div>
              </SettingsSection>
            )}

            {activeSection === 'roles' && (
              <SettingsSection id="roles" title="Roles" description="Assign roles automatically and restore selected roles when members rejoin." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
                <div className="form-grid">
                  <Multi label="Auto roles" help="Free supports one role. Paid plans support up to ten." values={drafts.general.autoroles} options={roles} onChange={value => set('general', data => (data.autoroles = value, data))} />
                  <div>
                    <Multi label="Sticky roles" help="Restored when a returning member rejoins." values={drafts.general.stickyRoles.roleIds} options={roles} onChange={value => set('general', data => (data.stickyRoles.roleIds = value, data))} />
                    <Check label="Enable sticky roles" checked={drafts.general.stickyRoles.enabled} onChange={value => set('general', data => (data.stickyRoles.enabled = value, data))} />
                  </div>
                </div>
              </SettingsSection>
            )}

            {activeSection === 'community' && (
              <SettingsSection id="community" title="Community tools" description="Manage suggestions, appeals and the server starboard." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
                <div className="split-settings three">
                  <div className="setting-block">
                    <h3>Suggestions</h3>
                    <Check label="Enable suggestions" checked={drafts.general.suggestions.enabled} onChange={value => set('general', data => (data.suggestions.enabled = value, data))} />
                    <ChannelSelect label="Suggestions channel" value={drafts.general.suggestions.channelId} channels={channels} onChange={value => set('general', data => (data.suggestions.channelId = value, data))} />
                  </div>
                  <div className="setting-block">
                    <h3>Appeals</h3>
                    <Check label="Enable appeals" checked={drafts.general.appeals.enabled} onChange={value => set('general', data => (data.appeals.enabled = value, data))} />
                    <ChannelSelect label="Appeals channel" value={drafts.general.appeals.channelId} channels={channels} onChange={value => set('general', data => (data.appeals.channelId = value, data))} />
                  </div>
                  <div className="setting-block">
                    <h3>Starboard</h3>
                    <Check label="Enable starboard" checked={drafts.general.starboard.enabled} onChange={value => set('general', data => (data.starboard.enabled = value, data))} />
                    <ChannelSelect label="Starboard channel" value={drafts.general.starboard.channelId} channels={channels} onChange={value => set('general', data => (data.starboard.channelId = value, data))} />
                    <div className="form-grid compact-grid">
                      <Text label="Star emoji" value={drafts.general.starboard.emoji} onChange={value => set('general', data => (data.starboard.emoji = value, data))} />
                      <Text label="Threshold" type="number" min="1" max="100" value={drafts.general.starboard.threshold} onChange={value => set('general', data => (data.starboard.threshold = value, data))} />
                    </div>
                  </div>
                </div>
              </SettingsSection>
            )}

            {activeSection === 'automod' && (
              <SettingsSection id="automod" title="AutoMod" description="Filter harmful messages and choose how ModerationDesk responds." guildId={guildId} csrf={session.csrf} section="automod" data={drafts.automod}>
                <div className="workspace-summary">
                  <div><span className="workspace-summary-label">Protection status</span><strong className={drafts.automod.enabled ? 'summary-good' : 'summary-muted'}>{drafts.automod.enabled ? 'Active' : 'Not active'}</strong><p>{drafts.automod.enabled ? 'ModerationDesk is checking messages in this server.' : 'Turn on AutoMod when you are ready to start filtering messages.'}</p></div>
                  <div><span className="workspace-summary-label">Checks enabled</span><strong>{[drafts.automod.antiInvites, drafts.automod.antiLinks, drafts.automod.antiSpam, drafts.automod.antiDuplicates, drafts.automod.antiMassMentions, drafts.automod.antiCaps].filter(Boolean).length}<small> / 6</small></strong><p>Message patterns currently monitored.</p></div>
                  <div><span className="workspace-summary-label">Response</span><strong>{drafts.automod.action === 'delete' ? 'Delete' : drafts.automod.action === 'warn' ? 'Warn' : 'Timeout'}</strong><p>What happens when a check triggers.</p></div>
                </div>
                <div className="split-settings">
                  <div className="setting-block check-list">
                    <h3>Message checks</h3>
                    <Check label="Enable AutoMod" checked={drafts.automod.enabled} onChange={value => set('automod', data => (data.enabled = value, data))} />
                    <Check label="Block Discord invites" checked={drafts.automod.antiInvites} onChange={value => set('automod', data => (data.antiInvites = value, data))} />
                    <Check label="Block non-allowlisted links" checked={drafts.automod.antiLinks} onChange={value => set('automod', data => (data.antiLinks = value, data))} />
                    <Check label="Detect spam" checked={drafts.automod.antiSpam} onChange={value => set('automod', data => (data.antiSpam = value, data))} />
                    <Check label="Detect duplicate messages" checked={drafts.automod.antiDuplicates} onChange={value => set('automod', data => (data.antiDuplicates = value, data))} />
                    <Check label="Detect mass mentions" checked={drafts.automod.antiMassMentions} onChange={value => set('automod', data => (data.antiMassMentions = value, data))} />
                    <Check label="Detect excessive capitals" checked={drafts.automod.antiCaps} onChange={value => set('automod', data => (data.antiCaps = value, data))} />
                  </div>
                  <div className="setting-block">
                    <h3>Response</h3>
                    <Select label="Action" value={drafts.automod.action} onChange={value => set('automod', data => (data.action = value, data))}><option value="delete">Delete only</option><option value="warn">Delete and warn</option><option value="timeout">Delete and timeout</option></Select>
                    <Text label="Timeout seconds" type="number" min="10" max="2419200" value={drafts.automod.timeoutSeconds} onChange={value => set('automod', data => (data.timeoutSeconds = value, data))} />
                  </div>
                </div>
                <div className="form-grid form-divider">
                  <Text label="Maximum mentions" type="number" min="2" max="50" value={drafts.automod.maxMentions} onChange={value => set('automod', data => (data.maxMentions = value, data))} />
                  <Text label="Spam messages" type="number" min="3" max="30" value={drafts.automod.spamMaxMessages} onChange={value => set('automod', data => (data.spamMaxMessages = value, data))} />
                  <Text label="Spam window seconds" type="number" min="2" max="60" value={drafts.automod.spamWindowSeconds} onChange={value => set('automod', data => (data.spamWindowSeconds = value, data))} />
                  <Text label="Duplicate limit" type="number" min="2" max="10" value={drafts.automod.duplicateMax} onChange={value => set('automod', data => (data.duplicateMax = value, data))} />
                  <Area label="Blocked words" help="One entry per line." value={drafts.automod.blockedWords} onChange={value => set('automod', data => (data.blockedWords = value, data))} />
                  <Area label="Allowed domains" help="One domain per line." value={drafts.automod.allowedDomains} onChange={value => set('automod', data => (data.allowedDomains = value, data))} />
                  <Multi label="Exempt roles" values={drafts.automod.exemptRoleIds} options={roles} onChange={value => set('automod', data => (data.exemptRoleIds = value, data))} />
                  <Multi label="Exempt channels" values={drafts.automod.exemptChannelIds} options={channels} onChange={value => set('automod', data => (data.exemptChannelIds = value, data))} />
                </div>
              </SettingsSection>
            )}

            {activeSection === 'anti-raid' && (
              <SettingsSection id="anti-raid" title="Anti-raid" description="Detect sudden join spikes and quarantine suspicious accounts." guildId={guildId} csrf={session.csrf} section="security" data={drafts.security}>
                <div className="workspace-summary protection-summary"><div><span className="workspace-summary-label">Join protection</span><strong className={drafts.security.antiRaid.enabled ? 'summary-good' : 'summary-muted'}>{drafts.security.antiRaid.enabled ? 'Active' : 'Not active'}</strong><p>Protects the server when joins spike.</p></div><div><span className="workspace-summary-label">Trigger</span><strong>{drafts.security.antiRaid.joinThreshold}<small> joins / {drafts.security.antiRaid.windowSeconds}s</small></strong><p>Detection window.</p></div><div><span className="workspace-summary-label">Recovery</span><strong>{drafts.security.antiRaid.autoUnlockMinutes}<small> min</small></strong><p>Automatic unlock delay.</p></div></div>
                <Check label="Enable anti-raid" checked={drafts.security.antiRaid.enabled} onChange={value => set('security', data => (data.antiRaid.enabled = value, data))} />
                <div className="form-grid form-divider">
                  <Text label="Join threshold" type="number" min="3" max="100" value={drafts.security.antiRaid.joinThreshold} onChange={value => set('security', data => (data.antiRaid.joinThreshold = value, data))} />
                  <Text label="Window seconds" type="number" min="5" max="300" value={drafts.security.antiRaid.windowSeconds} onChange={value => set('security', data => (data.antiRaid.windowSeconds = value, data))} />
                  <Text label="Auto-unlock minutes" type="number" min="1" max="1440" value={drafts.security.antiRaid.autoUnlockMinutes} onChange={value => set('security', data => (data.antiRaid.autoUnlockMinutes = value, data))} />
                  <Text label="Minimum account age days" type="number" min="0" max="3650" value={drafts.security.antiRaid.minimumAccountAgeDays} onChange={value => set('security', data => (data.antiRaid.minimumAccountAgeDays = value, data))} />
                  <RoleSelect label="Quarantine role" value={drafts.security.antiRaid.quarantineRoleId} roles={roles} onChange={value => set('security', data => (data.antiRaid.quarantineRoleId = value, data))} />
                </div>
              </SettingsSection>
            )}

            {activeSection === 'anti-nuke' && (
              <SettingsSection id="anti-nuke" title="Anti-nuke" description="Respond to destructive actions and restore deleted server objects." guildId={guildId} csrf={session.csrf} section="security" data={drafts.security}>
                <div className="workspace-summary protection-summary"><div><span className="workspace-summary-label">Server integrity</span><strong className={drafts.security.antiNuke.enabled ? 'summary-good' : 'summary-muted'}>{drafts.security.antiNuke.enabled ? 'Protected' : 'Not protected'}</strong><p>Watches dangerous changes to the server.</p></div><div><span className="workspace-summary-label">Response</span><strong>{drafts.security.antiNuke.action === 'ban' ? 'Ban executor' : 'Strip roles'}</strong><p>Action taken when a threshold is reached.</p></div><div><span className="workspace-summary-label">Recovery</span><strong>{drafts.security.antiNuke.restoreDeletedObjects ? 'Enabled' : 'Off'}</strong><p>Restore deleted channels and roles.</p></div></div>
                <div className="form-grid">
                  <div>
                    <Check label="Enable anti-nuke" checked={drafts.security.antiNuke.enabled} onChange={value => set('security', data => (data.antiNuke.enabled = value, data))} />
                    <Check label="Restore deleted channels and roles" checked={drafts.security.antiNuke.restoreDeletedObjects} onChange={value => set('security', data => (data.antiNuke.restoreDeletedObjects = value, data))} />
                  </div>
                  <Select label="Enforcement action" value={drafts.security.antiNuke.action} onChange={value => set('security', data => (data.antiNuke.action = value, data))}><option value="strip_roles">Strip dangerous roles</option><option value="ban">Ban executor</option></Select>
                  <Multi label="Trusted roles" values={drafts.security.antiNuke.trustedRoleIds} options={roles} onChange={value => set('security', data => (data.antiNuke.trustedRoleIds = value, data))} />
                </div>
                {plan !== 'enterprise' && <div className="notice form-divider">Anti-nuke enforcement is available on Enterprise. Your settings will be kept if you configure them before upgrading.</div>}
              </SettingsSection>
            )}

            {activeSection === 'verification' && (
              <SettingsSection id="verification" title="Verification" description="Publish a verification panel and assign member roles safely." guildId={guildId} csrf={session.csrf} section="verification" data={drafts.verification}>
                <div className="workspace-summary access-summary"><div><span className="workspace-summary-label">Member access</span><strong className={drafts.verification.enabled ? 'summary-good' : 'summary-muted'}>{drafts.verification.enabled ? 'Enabled' : 'Not enabled'}</strong><p>{drafts.verification.enabled ? 'New members can complete the configured verification flow.' : 'Members currently join without a ModerationDesk verification gate.'}</p></div><div><span className="workspace-summary-label">Method</span><strong>{drafts.verification.mode === 'oauth' ? 'Discord OAuth' : 'Button'}</strong><p>How members complete verification.</p></div><div><span className="workspace-summary-label">Verified role</span><strong>{roles.find(role => role.id === drafts.verification.verifiedRoleId)?.name || 'Not selected'}</strong><p>Applied after completion.</p></div></div>
                <div className="form-grid">
                  <div><Check label="Enable verification" checked={drafts.verification.enabled} onChange={value => set('verification', data => (data.enabled = value, data))} /><Select label="Mode" value={drafts.verification.mode} onChange={value => set('verification', data => (data.mode = value, data))}><option value="button">Discord button</option><option value="oauth">Discord OAuth</option></Select></div>
                  <ChannelSelect label="Verification channel" value={drafts.verification.channelId} channels={channels} onChange={value => set('verification', data => (data.channelId = value, data))} />
                  <RoleSelect label="Verified role" value={drafts.verification.verifiedRoleId} roles={roles} onChange={value => set('verification', data => (data.verifiedRoleId = value, data))} />
                  <RoleSelect label="Unverified role" value={drafts.verification.unverifiedRoleId} roles={roles} onChange={value => set('verification', data => (data.unverifiedRoleId = value, data))} />
                  <div className="full"><Area label="Panel message" value={drafts.verification.message} onChange={value => set('verification', data => (data.message = value, data))} /></div>
                </div>
              </SettingsSection>
            )}

            {activeSection === 'billing' && (
              <section className="card settings-section" id="billing">
                <div className="settings-header"><div><span className="settings-kicker">Account</span><h2>Billing</h2><p>Manage the plan attached to this Discord server.</p></div><span className="badge">{plan}</span></div>
                <div className="settings-body">
                  <div className="billing-summary"><span>Current plan</span><strong>{plan.toUpperCase()}</strong><small>Billing status: {guild.config.billing.status || 'not linked'}</small></div>
                  {guild.billingConfigured ? <div className="form-actions">{guild.config.billing.linked ? <button className="button secondary" disabled={billingBusy} onClick={() => billing('portal')}>Manage billing</button> : <><button className="button" disabled={billingBusy} onClick={() => billing('checkout', { plan: 'pro' })}>Subscribe to Pro</button><button className="button secondary" disabled={billingBusy} onClick={() => billing('checkout', { plan: 'enterprise' })}>Subscribe to Enterprise</button></>}</div> : <div className="notice">Billing is not yet connected. Plans can still be assigned through the protected administration service.</div>}
                </div>
              </section>
            )}

            {activeSection === 'data' && (
              <section className="card settings-section" id="data">
                <div className="settings-header"><div><span className="settings-kicker">Account</span><h2>Data & privacy</h2><p>Export or remove the server data stored by ModerationDesk.</p></div></div>
                <div className="settings-body">
                  <div className="data-action">
                    <div><h3>Export server data</h3><p>Download configuration, moderation records, appeals and migration records as JSON.</p></div>
                    <a className="button secondary" href={`/api/guilds/${guildId}/export`}>Download export</a>
                  </div>
                  <div className="data-action">
                    <div><h3>Public appeal page</h3><p>Open the form members can use to submit an appeal.</p></div>
                    <a className="button ghost" href={guild.appealUrl}>Open appeal page</a>
                  </div>
                  <div className="danger-panel">
                    <h3>Delete stored server data</h3>
                    <p>This removes ModerationDesk configuration, cases, warnings, notes, appeals and migration records. It does not delete Discord messages or roles.</p>
                    <Text label="Type the server ID to confirm" value={danger} onChange={setDanger} placeholder={guildId} />
                    <div className="form-actions"><button className="button danger" disabled={danger !== guildId} onClick={deleteData}>Delete all stored data</button></div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
