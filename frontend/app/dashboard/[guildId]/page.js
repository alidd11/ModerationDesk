'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Shell from '../../../components/Shell';
import SettingsSection from '../../../components/SettingsSection';
import { Area, ChannelSelect, Check, ModuleToggle, Multi, RoleSelect, Select, Text } from '../../../components/Fields';
import { api } from '../../../lib/api';
import { dashboardNavigation as navigation, dashboardSections as validSections } from '../../../lib/dashboardNavigation';

const copy = value => JSON.parse(JSON.stringify(value));

const LOG_EVENT_OPTIONS = {
  moderation: [
    ['member_warned', 'Warnings'], ['member_kicked', 'Kicks'], ['member_banned', 'Bans'], ['member_unbanned', 'Unbans'],
    ['member_softbanned', 'Softbans'], ['member_timed_out', 'Timeouts'], ['member_tempbanned', 'Temporary bans'],
    ['member_tempmuted', 'Temporary mutes'], ['member_unmuted', 'Timeouts removed'], ['moderation_case', 'Other moderation cases']
  ],
  security: [
    ['automod_action', 'AutoMod actions'], ['anti_raid_triggered', 'Anti-raid triggers'], ['anti_nuke_triggered', 'Anti-nuke triggers'],
    ['new_account_quarantined', 'New-account quarantines'], ['join_gate_action', 'Join Gate actions'], ['server_lockdown_started', 'Lockdowns started'], ['server_lockdown_ended', 'Lockdowns ended'], ['webhook_activity', 'Webhook activity']
  ],
  messages: [['message_deleted', 'Deleted messages'], ['messages_bulk_deleted', 'Bulk deleted messages'], ['message_edited', 'Edited messages']],
  member: [['member_joined', 'Member joins'], ['member_left_or_was_removed', 'Member leaves'], ['member_updated', 'Member and role changes'], ['voice_joined', 'Voice joins'], ['voice_left', 'Voice leaves'], ['voice_moved', 'Voice moves'], ['voice_moderation_updated', 'Voice moderation']],
  server: [['channel_created', 'Channels created'], ['channel_deleted', 'Channels deleted'], ['channel_updated', 'Channels updated'], ['role_created', 'Roles created'], ['role_deleted', 'Roles deleted'], ['role_updated', 'Roles updated'], ['server_settings_updated', 'Server settings'], ['configuration_updated', 'Dashboard configuration'], ['invite_created', 'Invites created'], ['invite_deleted', 'Invites deleted'], ['thread_created', 'Threads created'], ['thread_deleted', 'Threads deleted'], ['thread_updated', 'Threads updated'], ['emoji_created', 'Emojis created'], ['emoji_deleted', 'Emojis deleted'], ['emoji_updated', 'Emojis updated']],
  appeals: [['new_appeal', 'Appeals submitted'], ['appeal_resolved', 'Appeals resolved']]
};

const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const formatDate = value => value ? dateFormatter.format(new Date(value)) : '—';
const titleCase = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const planLabel = plan => plan === 'enterprise' ? 'Pro+' : titleCase(plan);
const needsUpgrade = (item, plan) => item.plan === 'Pro+' ? plan !== 'enterprise' : item.plan === 'Pro' ? plan === 'free' : false;
const AUTOMOD_PRESETS = {
  community: { label: 'Community', description: 'Invites, spam, duplicates and mass mentions. A sensible starting point for active public servers.', values: { enabled: true, action: 'delete', antiInvites: true, antiLinks: false, antiSpam: true, antiDuplicates: true, antiMassMentions: true, antiCaps: false, maxMentions: 5, spamMaxMessages: 6, spamWindowSeconds: 8, duplicateMax: 3 } },
  strict: { label: 'Strict', description: 'Adds link and capitals checks with a quicker spam threshold for high-volume communities.', values: { enabled: true, action: 'warn', antiInvites: true, antiLinks: true, antiSpam: true, antiDuplicates: true, antiMassMentions: true, antiCaps: true, maxMentions: 4, spamMaxMessages: 5, spamWindowSeconds: 8, duplicateMax: 3 } },
  'high-risk': { label: 'High-risk', description: 'A stronger starting point for raid-prone or frequently targeted communities.', values: { enabled: true, action: 'timeout', antiInvites: true, antiLinks: true, antiSpam: true, antiDuplicates: true, antiMassMentions: true, antiCaps: true, maxMentions: 3, spamMaxMessages: 4, spamWindowSeconds: 7, duplicateMax: 2, timeoutSeconds: 900 } }
};

function Status({ enabled, children }) {
  return <span className={`feature-status ${enabled ? 'enabled' : ''}`}><i aria-hidden="true" />{children}</span>;
}

function SettingsDisclosure({ title, description, badge, children }) {
  return <details className="settings-disclosure">
    <summary>
      <span><strong>{title}</strong><small>{description}</small></span>
      <span className="settings-disclosure-meta">{badge && <b>{badge}</b>}<i aria-hidden="true">⌄</i></span>
    </summary>
    <div className="settings-disclosure-content">{children}</div>
  </details>;
}

export default function GuildDashboardPage({ initialSection = 'overview' }) {
  const { guildId } = useParams();
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [guild, setGuild] = useState(null);
  const [drafts, setDrafts] = useState(null);
  const [records, setRecords] = useState({ cases: [], appeals: [], activity: [] });
  const [activeSection, setActiveSection] = useState(initialSection);
  const [error, setError] = useState('');
  const [danger, setDanger] = useState('');
  const [billingBusy, setBillingBusy] = useState(false);
  const [logTestBusy, setLogTestBusy] = useState(false);
  const [logTestResult, setLogTestResult] = useState('');
  const [activeLogGroup, setActiveLogGroup] = useState('moderation');
  const [automodTest, setAutomodTest] = useState('');
  const [automodTestBusy, setAutomodTestBusy] = useState(false);
  const [automodTestResult, setAutomodTestResult] = useState(null);
  const [activityCategory, setActivityCategory] = useState('');
  const [activityQuery, setActivityQuery] = useState('');

  useEffect(() => {
    Promise.all([
      api('/api/auth/session'),
      api(`/api/guilds/${guildId}`),
      api(`/api/guilds/${guildId}/cases?limit=50`),
      api(`/api/guilds/${guildId}/appeals`),
      api(`/api/guilds/${guildId}/activity?limit=50`).catch(() => ({ events: [] }))
    ])
      .then(([sessionData, guildData, caseData, appealData, activityData]) => {
        setSession(sessionData);
        setGuild(guildData.guild);
        setRecords({ cases: caseData.cases, appeals: appealData.appeals, activity: activityData.events });
        const cfg = guildData.guild.config;
        setDrafts({
          general: {
            locale: cfg.locale || 'en-GB',
            staffRoleIds: cfg.staffRoleIds,
            adminRoleIds: cfg.adminRoleIds,
            logs: cfg.logs,
            logEvents: cfg.logEvents || Object.fromEntries(Object.keys(LOG_EVENT_OPTIONS).map(key => [key, []])),
            logEventChannels: cfg.logEventChannels || Object.fromEntries(Object.keys(LOG_EVENT_OPTIONS).map(key => [key, {}])),
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
          security: { ...cfg.security, joinGate: { ...cfg.security.joinGate, blockedTerms: (cfg.security.joinGate?.blockedTerms || []).join('\n') } },
          moderation: cfg.moderation,
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

  const set = (section, updater) => setDrafts(current => ({ ...current, [section]: updater(copy(current[section])) }));
  const plan = guild?.config?.plan || 'free';
  const discordStore = guild?.discordBilling?.store || 'https://discord.com/application-directory/1528046559923666944/store';
  const proStore = guild?.discordBilling?.pro || discordStore;
  const proPlusStore = guild?.discordBilling?.enterprise || discordStore;

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

  async function testLogDelivery(group) {
    setLogTestBusy(true);
    setLogTestResult('');
    try {
      await api(`/api/guilds/${guildId}/logging/test`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': session.csrf },
        body: JSON.stringify({ group, channelId: drafts.general.logs[group] })
      });
      setLogTestResult(`A delivery test was sent to the ${group} log channel.`);
    } catch (error) {
      setLogTestResult(error.message === 'log_delivery_failed' ? 'ModerationDesk could not send to that channel. Check channel access and role hierarchy.' : error.message);
    } finally {
      setLogTestBusy(false);
    }
  }

  function applyAutomodPreset(preset) {
    const selected = AUTOMOD_PRESETS[preset];
    if (!selected) return;
    set('automod', data => ({ ...data, ...selected.values, preset }));
    setAutomodTestResult(null);
  }

  async function testAutomodRules() {
    setAutomodTestBusy(true);
    setAutomodTestResult(null);
    try {
      const result = await api(`/api/guilds/${guildId}/automod/test`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': session.csrf },
        body: JSON.stringify({ content: automodTest, mentionCount: (automodTest.match(/<@/g) || []).length })
      });
      setAutomodTestResult(result);
    } catch (error) {
      setAutomodTestResult({ error: error.message });
    } finally {
      setAutomodTestBusy(false);
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
  const diagnostics = guild.diagnostics || { score: 0, checks: [] };
  const openAppeals = records.appeals.filter(appeal => appeal.status === 'open');
  const filteredActivity = records.activity.filter(item => {
    const matchesCategory = !activityCategory || item.category === activityCategory;
    const query = activityQuery.trim().toLowerCase();
    const matchesQuery = !query || [item.actorName, item.action, item.category, item.summary].join(' ').toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
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
    activity: records.activity.length > 0,
    appeals: openAppeals.length > 0,
    policies: drafts.moderation.escalation.enabled,
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
        {error && <div className="error dashboard-error">{error}</div>}

        <section className="dashboard-context" aria-label="Current server">
          <div className="dashboard-context-server">
            {guild.icon ? <img className="dashboard-context-icon" src={guild.icon} alt="" /> : <div className="dashboard-context-icon">{guild.name.slice(0, 2).toUpperCase()}</div>}
            <div><span>Server workspace</span><strong>{guild.name}</strong><small>{guild.memberCount.toLocaleString()} members <i aria-hidden="true">·</i> <b className={health.connected ? 'online' : ''}>{health.connected ? 'Connected' : 'Offline'}</b> <i aria-hidden="true">·</i> {planLabel(plan)} plan</small></div>
          </div>
          <div className="dashboard-context-actions">
            <a href="/dashboard">All servers</a>
            <a href={`https://discord.com/channels/${guildId}`} target="_blank" rel="noreferrer">Open Discord <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <div className="dashboard-layout">
          <aside className="sidebar" aria-label="Server settings">
            <button className="sidebar-find" type="button" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}><span><i aria-hidden="true">⌕</i> Find a setting</span><kbd>⌘K</kbd></button>
            {navigation.map(group => (
              <div className="sidebar-group" key={group.label}>
                <div className="sidebar-label"><span>{group.label}</span><small>{group.description}</small></div>
                <nav aria-label={`${group.label} settings`}>
                  {group.items.map(item => (
                    <a
                      className={activeSection === item.id ? 'active' : ''}
                      href={`/${guildId ? `dashboard/${guildId}/` : 'dashboard/'}${item.id}`}
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      aria-current={activeSection === item.id ? 'page' : undefined}
                    >
                      <span>{item.label}</span>
                      <span className="nav-meta">
                        {item.plan && <span className={`nav-plan ${needsUpgrade(item, plan) ? 'locked' : ''}`} title={needsUpgrade(item, plan) ? `${item.plan} plan required` : `${item.plan} feature`} aria-label={needsUpgrade(item, plan) ? `${item.plan} plan required` : `${item.plan} feature`}><i className="nav-plan-icon" aria-hidden="true" /><em>{item.plan}</em></span>}
                        <b className={`nav-dot ${sectionStatuses[item.id] ? 'enabled' : ''}`} aria-hidden="true" /><i aria-hidden="true">›</i>
                      </span>
                    </a>
                  ))}
                </nav>
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
                        <a href="#automod" onClick={() => setActiveSection('automod')}><span><b>AutoMod</b><small>Message screening and immediate actions</small></span><Status enabled={drafts.automod.enabled}>{drafts.automod.enabled ? 'Enabled' : 'Disabled'}</Status></a>
                        <a href="#anti-raid" onClick={() => setActiveSection('anti-raid')}><span><b>Anti-Raid</b><small>Join-spike detection and quarantine</small></span><Status enabled={drafts.security.antiRaid.enabled}>{drafts.security.antiRaid.enabled ? 'Enabled' : 'Disabled'}</Status></a>
                        <a href="#anti-nuke" onClick={() => setActiveSection('anti-nuke')}><span><b>Anti-Nuke</b><small>Destructive-action response</small></span><Status enabled={drafts.security.antiNuke.enabled}>{drafts.security.antiNuke.enabled ? 'Enabled' : 'Disabled'}</Status></a>
                        <a href="#verification" onClick={() => setActiveSection('verification')}><span><b>Verification</b><small>Controlled member access</small></span><Status enabled={drafts.verification.enabled}>{drafts.verification.enabled ? 'Enabled' : 'Disabled'}</Status></a>
                      </div>
                    </div>
                  </div>

                  <SettingsDisclosure title="More workspace details" description="Review recent cases, configuration activity and readiness checks without leaving this page.">
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
                        <a href="#staff-access" onClick={() => setActiveSection('staff-access')}><span>Staff permissions</span><Status enabled={drafts.general.staffRoleIds.length > 0}>{drafts.general.staffRoleIds.length ? 'Configured' : 'Required'}</Status></a>
                        <a href="#logging" onClick={() => setActiveSection('logging')}><span>Action log</span><Status enabled={configuredLogs > 0}>{configuredLogs ? `${configuredLogs} channels` : 'Required'}</Status></a>
                        <a href="#automod" onClick={() => setActiveSection('automod')}><span>AutoMod</span><Status enabled={drafts.automod.enabled}>{drafts.automod.enabled ? 'Enabled' : 'Optional'}</Status></a>
                        <a href="#verification" onClick={() => setActiveSection('verification')}><span>Verification</span><Status enabled={drafts.verification.enabled}>{drafts.verification.enabled ? 'Enabled' : 'Optional'}</Status></a>
                      </div>
                    </div>
                    <div className="overview-panel stack-panel">
                      <div className="panel-heading"><div><h3>Configuration activity</h3><p>Recent dashboard changes, with the person who made them.</p></div><a href={`/${guildId ? `dashboard/${guildId}/` : 'dashboard/'}activity`} onClick={() => setActiveSection('activity')}>View all</a></div>
                      <div className="compact-records">
                        {records.activity.slice(0, 4).map(item => <div key={item.id}><span className="record-index">●</span><span><b>{titleCase(item.action)}</b><small>{item.actorName}: {item.summary}</small></span><time>{formatDate(item.createdAt)}</time></div>)}
                        {!records.activity.length && <div className="empty-state compact"><strong>No dashboard changes yet</strong><span>Configuration changes will appear here with the person who made them.</span></div>}
                      </div>
                    </div>
                    <div className="overview-panel stack-panel">
                      <div className="panel-heading"><div><h3>Readiness checks</h3><p>Permissions, role hierarchy and key configuration.</p></div><strong>{diagnostics.score}%</strong></div>
                      <div className="compact-records">
                        {diagnostics.checks.filter(check => !check.ok).slice(0, 4).map(check => <div key={check.id}><span className="record-index">!</span><span><b>{check.label}</b><small>{check.detail}</small></span><a href={`/${guildId ? `dashboard/${guildId}` : 'dashboard'}`}>Review</a></div>)}
                        {!diagnostics.checks.some(check => !check.ok) && <div className="empty-state compact"><strong>Ready to moderate</strong><span>Core permissions, hierarchy and configuration checks are passing.</span></div>}
                      </div>
                    </div>
                  </div>
                  </SettingsDisclosure>
                </div>
              </section>
            )}

            {activeSection === 'activity' && (
              <section className="card settings-section" id="activity">
                <div className="settings-header"><div><span className="settings-kicker">Accountability</span><h2>Activity log</h2><p>Review configuration, moderation and security activity in one audit trail.</p></div><span className="record-count">{filteredActivity.length} shown</span></div>
                <div className="settings-body record-section">
                  <div className="activity-filters"><Select label="Area" value={activityCategory} onChange={setActivityCategory}><option value="">All activity</option><option value="configuration">Configuration</option><option value="logging">Logging</option><option value="moderation">Moderation</option><option value="security">Security</option></Select><Text label="Search activity" value={activityQuery} onChange={setActivityQuery} placeholder="Actor, action or detail" /></div>
                  {filteredActivity.length ? <div className="record-table-wrap"><table className="record-table activity-table"><thead><tr><th>When</th><th>Person</th><th>Area</th><th>Change</th></tr></thead><tbody>{filteredActivity.map(item => <tr key={item.id}><td><time>{formatDate(item.createdAt)}</time></td><td><strong>{item.actorName || 'System'}</strong><br /><span className="mono">{item.actorId || '—'}</span></td><td><span className="record-status closed">{titleCase(item.category)}</span></td><td className="record-reason"><strong>{titleCase(item.action)}</strong><br />{item.summary || 'Activity recorded.'}</td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>No matching activity</strong><p>Adjust the area or search filters to review another part of the investigation trail.</p></div>}
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

            {activeSection === 'policies' && (
              <SettingsSection id="policies" title="Warning actions" description="Set automatic consequences when staff warnings add up. AutoMod actions are managed separately." guildId={guildId} csrf={session.csrf} section="moderation" data={drafts.moderation} headerControl={<ModuleToggle label="Enable warning actions" checked={drafts.moderation.escalation.enabled} onChange={value => set('moderation', data => (data.escalation.enabled = value, data))} />}>
                <div className="discipline-intro"><span className="workspace-summary-label">How it works</span><strong>Staff warning <i aria-hidden="true">→</i> warning count <i aria-hidden="true">→</i> consequence</strong><p>Only a staff member using <code>/mod warn</code> advances this ladder. AutoMod can remove or act on a message immediately, but never triggers a discipline step.</p></div>
                <div className="discipline-ladder">
                  <article className="discipline-step">
                    <div className="discipline-step-head"><span>01</span><div><h3>Review period</h3><p>How long an active staff warning contributes to a member’s record.</p></div></div>
                    <Text label="Warning review window" help="Warnings expire from the ladder after this period." type="number" min="1" max="365" value={drafts.moderation.escalation.windowDays} onChange={value => set('moderation', data => (data.escalation.windowDays = value, data))} />
                  </article>
                  <article className="discipline-step">
                    <div className="discipline-step-head"><span>02</span><div><h3>First consequence</h3><p>Applied when a member reaches the first warning threshold.</p></div></div>
                    <div className="form-grid"><Text label="Warnings needed" type="number" min="1" max="50" value={drafts.moderation.escalation.firstThreshold} onChange={value => set('moderation', data => (data.escalation.firstThreshold = value, data))} /><Select label="Consequence" value={drafts.moderation.escalation.firstAction} onChange={value => set('moderation', data => (data.escalation.firstAction = value, data))}><option value="timeout">Timeout</option><option value="kick">Kick</option><option value="ban">Ban</option></Select><div className="full"><Text label="Timeout minutes" help="Used only when the first consequence is a timeout." type="number" min="1" max="40320" value={drafts.moderation.escalation.firstDurationMinutes} onChange={value => set('moderation', data => (data.escalation.firstDurationMinutes = value, data))} /></div></div>
                  </article>
                  <article className="discipline-step">
                    <div className="discipline-step-head"><span>03</span><div><h3>Final consequence</h3><p>Applied when repeated staff warnings reach the final threshold.</p></div></div>
                    <div className="form-grid"><Text label="Warnings needed" help="Must be equal to or above the first threshold." type="number" min="1" max="100" value={drafts.moderation.escalation.finalThreshold} onChange={value => set('moderation', data => (data.escalation.finalThreshold = value, data))} /><Select label="Consequence" value={drafts.moderation.escalation.finalAction} onChange={value => set('moderation', data => (data.escalation.finalAction = value, data))}><option value="timeout">Timeout</option><option value="kick">Kick</option><option value="ban">Ban</option></Select></div>
                  </article>
                </div>
                <div className="notice form-divider">Each discipline step creates its own case and uses the normal ModerationDesk member notice. Discord role hierarchy still prevents action against members ModerationDesk cannot moderate.</div>
              </SettingsSection>
            )}

            {activeSection === 'staff-access' && (
              <SettingsSection id="staff-access" title="Staff permissions" description="Choose which roles can use moderation commands and manage dashboard settings." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
                <div className="form-grid">
                  <Multi label="Staff roles" help="Roles allowed to use staff-level commands." values={drafts.general.staffRoleIds} options={roles} onChange={value => set('general', data => (data.staffRoleIds = value, data))} />
                  <Multi label="Administrator roles" help="Roles allowed to change protected configuration." values={drafts.general.adminRoleIds} options={roles} onChange={value => set('general', data => (data.adminRoleIds = value, data))} />
                  <Select label="Bot response language" help="Default for server-generated messages. Private prompts can use a member’s Discord language when it is supported." value={drafts.general.locale} onChange={value => set('general', data => (data.locale = value, data))}><option value="en-GB">English (United Kingdom)</option><option value="en-US">English (United States)</option><option value="es-ES">Español</option><option value="fr">Français</option><option value="de">Deutsch</option></Select>
                </div>
              </SettingsSection>
            )}

            {activeSection === 'commands' && (
              <SettingsSection id="commands" title="Commands" description="Rename, describe or hide ModerationDesk commands for this server. Changes are registered only in this Discord server." guildId={guildId} csrf={session.csrf} section="commands" data={drafts.commands}>
                <div className="command-customisation-list">
                  <div className="notice">Command names must be lowercase and use letters, numbers, hyphens or underscores. Subcommands stay the same, so your team can change the top-level wording without losing functionality.</div>
                  {Object.entries(drafts.commands.overrides).map(([key, value]) => (
                    <details className="command-customisation-row" key={key}>
                      <summary><span><strong>/{value.name || key}</strong><small>{value.enabled !== false ? 'Available in Discord' : 'Hidden from Discord'}</small></span><span>{value.enabled !== false ? 'Shown' : 'Hidden'}<i aria-hidden="true">⌄</i></span></summary>
                      <div className="command-customisation-fields">
                        <Text label="Command name" value={value.name || key} onChange={next => set('commands', data => (data.overrides[key] = { ...data.overrides[key], name: next }, data))} />
                        <Text label="Description" value={value.description || ''} onChange={next => set('commands', data => (data.overrides[key] = { ...data.overrides[key], description: next }, data))} />
                        <Check label="Show in Discord" checked={value.enabled !== false} onChange={next => set('commands', data => (data.overrides[key] = { ...data.overrides[key], enabled: next }, data))} />
                      </div>
                    </details>
                  ))}
                </div>
              </SettingsSection>
            )}

            {activeSection === 'logging' && (
              <SettingsSection id="logging" title="Action log" description="Route moderation, security and server events to the right staff channels." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
                <div className="workspace-summary logging-summary"><div><span className="workspace-summary-label">Audit coverage</span><strong>{Object.values(drafts.general.logs).filter(Boolean).length}<small> / 6 routed</small></strong><p>Event families currently connected to a Discord channel.</p></div><div><span className="workspace-summary-label">Event types</span><strong>20+</strong><p>Member, message, server and moderation events.</p></div><div><span className="workspace-summary-label">Delivery</span><strong className={Object.values(drafts.general.logs).some(Boolean) ? 'summary-good' : 'summary-muted'}>{Object.values(drafts.general.logs).some(Boolean) ? 'Configured' : 'Not configured'}</strong><p>Logs are sent as staff-only embeds.</p></div></div>
                <div className="log-coverage-grid">{Object.entries({ moderation: ['Moderation', 'Warnings, bans, kicks and case actions.'], security: ['Security', 'AutoMod, raid and anti-nuke events.'], messages: ['Messages', 'Deleted, edited and bulk-deleted messages.'], member: ['Members', 'Joins, leaves and role changes.'], server: ['Server', 'Channel and role changes.'], appeals: ['Appeals', 'Submissions and decisions.'] }).map(([group, [label, description]]) => <button type="button" className={`log-coverage-card ${activeLogGroup === group ? 'selected' : ''}`} onClick={() => { setActiveLogGroup(group); document.getElementById(`log-${group}`)?.focus(); }} key={group}><strong>{label}</strong><span>{description}</span></button>)}</div>
                <SettingsDisclosure title={`Choose ${titleCase(activeLogGroup)} events`} description="All events use this category’s channel by default. Expand only when an event needs a different destination.">
                  <div className="log-event-options">{(LOG_EVENT_OPTIONS[activeLogGroup] || []).map(([key, label]) => <div className="log-event-row" key={key}><Check label={label} checked={drafts.general.logEvents[activeLogGroup]?.length === 0 || drafts.general.logEvents[activeLogGroup]?.includes(key)} onChange={checked => set('general', data => { const current = data.logEvents[activeLogGroup] || []; data.logEvents[activeLogGroup] = checked ? [...new Set([...current, key])] : current.filter(value => value !== key); if (!checked) delete data.logEventChannels[activeLogGroup][key]; return data; })} /><ChannelSelect label="Override channel" value={drafts.general.logEventChannels[activeLogGroup]?.[key] || ''} channels={channels} onChange={value => set('general', data => { data.logEventChannels[activeLogGroup][key] = value; return data; })} /></div>)}</div>
                </SettingsDisclosure>
                <div className="log-channel-panel"><div><span className="workspace-summary-label">{activeLogGroup} channel</span><p>Only {activeLogGroup} events will be sent here.</p>{logTestResult && <small className="log-test-result">{logTestResult}</small>}</div><div className="log-channel-actions"><ChannelSelect id={`log-${activeLogGroup}`} label={`${titleCase(activeLogGroup)} log channel`} value={drafts.general.logs[activeLogGroup]} channels={channels} onChange={value => set('general', data => (data.logs[activeLogGroup] = value, data))} /><button type="button" className="button ghost small" disabled={!drafts.general.logs[activeLogGroup] || logTestBusy} onClick={() => testLogDelivery(activeLogGroup)}>{logTestBusy ? 'Sending…' : 'Test delivery'}</button></div></div>
              </SettingsSection>
            )}

            {activeSection === 'member-messages' && (
              <SettingsSection id="member-messages" title="Welcome & goodbye" description="Choose what members see when they join or leave your server." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
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
              <SettingsSection id="roles" title="Role management" description="Assign roles automatically and restore selected roles when members rejoin." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
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
              <SettingsSection id="community" title="Community" description="Manage suggestions, appeals and your server starboard." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
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
              <SettingsSection id="automod" title="AutoMod" description="Screen risky messages as they are sent and apply an immediate response." guildId={guildId} csrf={session.csrf} section="automod" data={drafts.automod} headerControl={<ModuleToggle label="Enable AutoMod" checked={drafts.automod.enabled} onChange={value => set('automod', data => (data.enabled = value, data))} />}>
                <div className="workspace-summary">
                  <div><span className="workspace-summary-label">Screening status</span><strong className={drafts.automod.enabled ? 'summary-good' : 'summary-muted'}>{drafts.automod.enabled ? 'Active' : 'Not active'}</strong><p>{drafts.automod.enabled ? 'Messages are checked before they remain visible.' : 'Turn screening on when you are ready to enforce message rules.'}</p></div>
                  <div><span className="workspace-summary-label">Message checks</span><strong>{[drafts.automod.antiInvites, drafts.automod.antiLinks, drafts.automod.antiSpam, drafts.automod.antiDuplicates, drafts.automod.antiMassMentions, drafts.automod.antiCaps].filter(Boolean).length}<small> / 6</small></strong><p>Content patterns currently monitored.</p></div>
                  <div><span className="workspace-summary-label">Immediate response</span><strong>{drafts.automod.action === 'delete' ? 'Remove only' : drafts.automod.action === 'warn' ? 'Remove + warn' : 'Remove + timeout'}</strong><p>Applied at message time—not from a warning count.</p></div>
                </div>
                <div className="automod-boundary"><strong>Message-time protection</strong><span>Message protection handles a single risky message immediately. Use the <a href={`/${guildId ? `dashboard/${guildId}/` : 'dashboard/'}policies`}>escalation policy</a> for a staff-warning consequence ladder.</span></div>
                <div className="settings-subhead form-divider"><div><h3>Start with a policy</h3><p>Apply a starting point, then refine the checks and rule policies below before saving.</p></div><span className="badge">Preset</span></div>
                <div className="automod-preset-grid">{Object.entries(AUTOMOD_PRESETS).map(([id, preset]) => <button type="button" key={id} className={`automod-preset ${drafts.automod.preset === id ? 'selected' : ''}`} onClick={() => applyAutomodPreset(id)}><strong>{preset.label}</strong><span>{preset.description}</span><i aria-hidden="true">Apply →</i></button>)}</div>
                <div className="split-settings">
                  <div className="setting-block check-list">
                    <h3>Message checks</h3>
                    <Check label="Block Discord invites" checked={drafts.automod.antiInvites} onChange={value => set('automod', data => (data.antiInvites = value, data))} />
                    <Check label="Block non-allowlisted links" checked={drafts.automod.antiLinks} onChange={value => set('automod', data => (data.antiLinks = value, data))} />
                    <Check label="Detect spam" checked={drafts.automod.antiSpam} onChange={value => set('automod', data => (data.antiSpam = value, data))} />
                    <Check label="Detect duplicate messages" checked={drafts.automod.antiDuplicates} onChange={value => set('automod', data => (data.antiDuplicates = value, data))} />
                    <Check label="Detect mass mentions" checked={drafts.automod.antiMassMentions} onChange={value => set('automod', data => (data.antiMassMentions = value, data))} />
                    <Check label="Detect excessive capitals" checked={drafts.automod.antiCaps} onChange={value => set('automod', data => (data.antiCaps = value, data))} />
                  </div>
                  <div className="setting-block">
                    <h3>Immediate response</h3>
                    <Select label="After removing the message" value={drafts.automod.action} onChange={value => set('automod', data => (data.action = value, data))}><option value="delete">Take no further member action</option><option value="warn">Create an AutoMod warning</option><option value="timeout">Temporarily timeout the member</option></Select>
                    <Text label="Timeout seconds" type="number" min="10" max="2419200" value={drafts.automod.timeoutSeconds} onChange={value => set('automod', data => (data.timeoutSeconds = value, data))} />
                  </div>
                </div>
                <SettingsDisclosure title="Advanced AutoMod settings" description="Tune thresholds, word lists and exemptions only when the defaults need adjusting.">
                  <div className="form-grid">
                    <Text label="Maximum mentions" type="number" min="2" max="50" value={drafts.automod.maxMentions} onChange={value => set('automod', data => (data.maxMentions = value, data))} />
                    <Text label="Spam messages" type="number" min="3" max="30" value={drafts.automod.spamMaxMessages} onChange={value => set('automod', data => (data.spamMaxMessages = value, data))} />
                    <Text label="Spam window seconds" type="number" min="2" max="60" value={drafts.automod.spamWindowSeconds} onChange={value => set('automod', data => (data.spamWindowSeconds = value, data))} />
                    <Text label="Duplicate limit" type="number" min="2" max="10" value={drafts.automod.duplicateMax} onChange={value => set('automod', data => (data.duplicateMax = value, data))} />
                    <Area label="Blocked words" help="One entry per line." value={drafts.automod.blockedWords} onChange={value => set('automod', data => (data.blockedWords = value, data))} />
                    <Area label="Allowed domains" help="One domain per line." value={drafts.automod.allowedDomains} onChange={value => set('automod', data => (data.allowedDomains = value, data))} />
                    <Multi label="Exempt roles" values={drafts.automod.exemptRoleIds} options={roles} onChange={value => set('automod', data => (data.exemptRoleIds = value, data))} />
                    <Multi label="Exempt channels" values={drafts.automod.exemptChannelIds} options={channels} onChange={value => set('automod', data => (data.exemptChannelIds = value, data))} />
                  </div>
                </SettingsDisclosure>
                <SettingsDisclosure title="Per-rule actions" description="Override the default response or send a specific AutoMod rule to a dedicated channel." badge="Pro">
                  <div className="rule-policy-grid">
                    {[['invites', 'Discord invites'], ['links', 'External links'], ['spam', 'Message spam'], ['duplicates', 'Repeated messages'], ['mentions', 'Mass mentions'], ['caps', 'Excessive capitals'], ['blockedWords', 'Blocked words']].map(([rule, label]) => <div className="rule-policy-row" key={rule}><strong>{label}</strong><Select label={`${label} action`} value={drafts.automod.ruleActions?.[rule] || 'inherit'} onChange={value => set('automod', data => (data.ruleActions[rule] = value, data))}><option value="inherit">Use global response</option><option value="delete">Delete only</option><option value="warn">Delete and warn</option><option value="timeout">Delete and timeout</option></Select><ChannelSelect label={`${label} log channel`} value={drafts.automod.ruleLogChannels?.[rule] || ''} channels={channels} onChange={value => set('automod', data => (data.ruleLogChannels[rule] = value, data))} /></div>)}
                  </div>
                </SettingsDisclosure>
                <SettingsDisclosure title="Test a message" description="Check how your saved direct-content rules respond before enabling them in Discord.">
                  <div className="automod-test-panel"><div><span className="workspace-summary-label">Rule test</span><h3>Test saved direct-content rules</h3><p>Paste a sample message to check links, invites, blocked words, mentions and capitals without posting anything to Discord.</p></div><div><Area label="Sample message" value={automodTest} onChange={setAutomodTest} placeholder="Paste a message to evaluate…" /><button type="button" className="button secondary small" disabled={!automodTest.trim() || automodTestBusy} onClick={testAutomodRules}>{automodTestBusy ? 'Testing…' : 'Test message'}</button>{automodTestResult && <div className={`automod-test-result ${automodTestResult.error ? 'bad' : automodTestResult.detection ? 'matched' : 'clear'}`}>{automodTestResult.error ? automodTestResult.error : automodTestResult.detection ? <><strong>{titleCase(automodTestResult.detection.rule)} matched</strong><span>{automodTestResult.detection.reason} · saved action: {automodTestResult.action}</span></> : <><strong>No direct-content rule matched</strong><span>{automodTestResult.note}</span></>}</div>}</div></div>
                </SettingsDisclosure>
              </SettingsSection>
            )}

            {activeSection === 'anti-raid' && (
              <SettingsSection id="anti-raid" title="Anti-Raid" description="Detect sudden join spikes and respond before a raid overwhelms your server." guildId={guildId} csrf={session.csrf} section="security" data={drafts.security} headerControl={<ModuleToggle label="Enable Anti-Raid" detail={plan === 'free' ? 'Pro plan required' : 'Enable module'} checked={drafts.security.antiRaid.enabled} disabled={plan === 'free'} onChange={value => set('security', data => (data.antiRaid.enabled = value, data))} />} upgrade={plan === 'free' ? { plan: 'Pro', title: 'Turn on Anti-Raid', description: 'See how raid detection and Join Gate work together, then activate the module for this server with ModerationDesk Pro.', href: proStore } : null}>
                <div className="workspace-summary protection-summary"><div><span className="workspace-summary-label">Join protection</span><strong className={drafts.security.antiRaid.enabled ? 'summary-good' : 'summary-muted'}>{drafts.security.antiRaid.enabled ? 'Active' : 'Not active'}</strong><p>Protects the server when joins spike.</p></div><div><span className="workspace-summary-label">Trigger</span><strong>{drafts.security.antiRaid.joinThreshold}<small> joins / {drafts.security.antiRaid.windowSeconds}s</small></strong><p>Detection window.</p></div><div><span className="workspace-summary-label">Recovery</span><strong>{drafts.security.antiRaid.autoUnlockMinutes}<small> min</small></strong><p>Automatic unlock delay.</p></div></div>
                <div className="form-grid form-divider">
                  <Text label="Join threshold" type="number" min="3" max="100" value={drafts.security.antiRaid.joinThreshold} onChange={value => set('security', data => (data.antiRaid.joinThreshold = value, data))} />
                  <Text label="Window seconds" type="number" min="5" max="300" value={drafts.security.antiRaid.windowSeconds} onChange={value => set('security', data => (data.antiRaid.windowSeconds = value, data))} />
                  <Text label="Auto-unlock minutes" type="number" min="1" max="1440" value={drafts.security.antiRaid.autoUnlockMinutes} onChange={value => set('security', data => (data.antiRaid.autoUnlockMinutes = value, data))} />
                  <Text label="Minimum account age days" type="number" min="0" max="3650" value={drafts.security.antiRaid.minimumAccountAgeDays} onChange={value => set('security', data => (data.antiRaid.minimumAccountAgeDays = value, data))} />
                  <RoleSelect label="Quarantine role" value={drafts.security.antiRaid.quarantineRoleId} roles={roles} onChange={value => set('security', data => (data.antiRaid.quarantineRoleId = value, data))} />
                </div>
                <SettingsDisclosure title="Join Gate" description="Optionally screen individual accounts that match an entry-risk policy, even without a join spike." badge="Pro">
                  <div className="workspace-summary join-gate-summary"><div><span className="workspace-summary-label">Gate status</span><strong className={drafts.security.joinGate.enabled ? 'summary-good' : 'summary-muted'}>{drafts.security.joinGate.enabled ? 'Active' : 'Not active'}</strong><p>Evaluated when a non-bot account joins.</p></div><div><span className="workspace-summary-label">Minimum age</span><strong>{drafts.security.joinGate.minimumAccountAgeDays}<small> days</small></strong><p>Accounts younger than this trigger the gate.</p></div><div><span className="workspace-summary-label">Response</span><strong>{titleCase(drafts.security.joinGate.action)}</strong><p>Applied when any selected signal matches.</p></div></div>
                  <Check label="Enable Join Gate" checked={drafts.security.joinGate.enabled} onChange={value => set('security', data => (data.joinGate.enabled = value, data))} />
                  <div className="form-grid form-divider">
                    <Text label="Minimum account age days" type="number" min="0" max="3650" value={drafts.security.joinGate.minimumAccountAgeDays} onChange={value => set('security', data => (data.joinGate.minimumAccountAgeDays = value, data))} />
                    <Select label="Join Gate action" value={drafts.security.joinGate.action} onChange={value => set('security', data => (data.joinGate.action = value, data))}><option value="quarantine">Quarantine</option><option value="timeout">Timeout</option><option value="kick">Kick</option><option value="ban">Ban</option></Select>
                    <Text label="Timeout minutes" help="Used only when the Join Gate action is timeout." type="number" min="1" max="40320" value={drafts.security.joinGate.timeoutMinutes} onChange={value => set('security', data => (data.joinGate.timeoutMinutes = value, data))} />
                    <RoleSelect label="Join Gate quarantine role" value={drafts.security.joinGate.quarantineRoleId} roles={roles} onChange={value => set('security', data => (data.joinGate.quarantineRoleId = value, data))} />
                    <Area label="Blocked identity terms" help="One word or phrase per line. Names containing a term trigger the gate." value={drafts.security.joinGate.blockedTerms} onChange={value => set('security', data => (data.joinGate.blockedTerms = value, data))} />
                    <div className="setting-block"><h3>Additional signal</h3><Check label="Require a custom avatar" checked={drafts.security.joinGate.requireAvatar} onChange={value => set('security', data => (data.joinGate.requireAvatar = value, data))} /></div>
                  </div>
                </SettingsDisclosure>
              </SettingsSection>
            )}

            {activeSection === 'anti-nuke' && (
              <SettingsSection id="anti-nuke" title="Anti-Nuke" description="Watch high-risk audit events, contain an executor and preserve a clear incident record." guildId={guildId} csrf={session.csrf} section="security" data={drafts.security} headerControl={<ModuleToggle label="Enable Anti-Nuke" detail={plan !== 'enterprise' ? 'Pro+ required' : 'Enable module'} checked={drafts.security.antiNuke.enabled} disabled={plan !== 'enterprise'} onChange={value => set('security', data => (data.antiNuke.enabled = value, data))} />} upgrade={plan !== 'enterprise' ? { plan: 'Pro+', title: 'Protect against destructive actions', description: 'Preview the containment, recovery and audit-response policy below. Upgrade this server to activate Anti-Nuke enforcement.', href: proPlusStore } : null}>
                <div className="workspace-summary protection-summary"><div><span className="workspace-summary-label">Server integrity</span><strong className={drafts.security.antiNuke.enabled ? 'summary-good' : 'summary-muted'}>{drafts.security.antiNuke.enabled ? 'Protected' : 'Not protected'}</strong><p>Watches destructive changes and dangerous permission escalation.</p></div><div><span className="workspace-summary-label">Response</span><strong>{drafts.security.antiNuke.action === 'ban' ? 'Ban executor' : 'Strip roles'}</strong><p>Action taken when a policy threshold is reached.</p></div><div><span className="workspace-summary-label">Panic response</span><strong>{drafts.security.antiNuke.panicMode ? 'Lockdown' : 'Controlled'}</strong><p>{drafts.security.antiNuke.panicMode ? 'Immediately locks messaging as part of enforcement.' : 'Uses your configured containment policy.'}</p></div></div>
                <div className="form-grid">
                  <div>
                    <Check label="Restore deleted channels and roles" checked={drafts.security.antiNuke.restoreDeletedObjects} onChange={value => set('security', data => (data.antiNuke.restoreDeletedObjects = value, data))} />
                    <Check label="Lock the server when enforcement runs" checked={drafts.security.antiNuke.lockdownOnTrigger} onChange={value => set('security', data => (data.antiNuke.lockdownOnTrigger = value, data))} />
                    <Check label="Panic mode (always lock down)" checked={drafts.security.antiNuke.panicMode} onChange={value => set('security', data => (data.antiNuke.panicMode = value, data))} />
                  </div>
                  <Select label="Enforcement action" value={drafts.security.antiNuke.action} onChange={value => set('security', data => (data.antiNuke.action = value, data))}><option value="strip_roles">Strip dangerous roles</option><option value="ban">Ban executor</option></Select>
                  <Multi label="Trusted roles" values={drafts.security.antiNuke.trustedRoleIds} options={roles} onChange={value => set('security', data => (data.antiNuke.trustedRoleIds = value, data))} />
                  <RoleSelect label="Quarantine role" value={drafts.security.antiNuke.quarantineRoleId} roles={roles} onChange={value => set('security', data => (data.antiNuke.quarantineRoleId = value, data))} />
                </div>
                <SettingsDisclosure title="Detection thresholds" description="Set the number of actions allowed in the detection window before Anti-Nuke responds.">
                <div className="form-grid">
                  <Text label="Detection window (seconds)" type="number" min="5" max="300" value={drafts.security.antiNuke.windowSeconds} onChange={value => set('security', data => (data.antiNuke.windowSeconds = value, data))} />
                  <Text label="Channel deletions" type="number" min="1" max="25" value={drafts.security.antiNuke.thresholds.channelDelete} onChange={value => set('security', data => (data.antiNuke.thresholds.channelDelete = value, data))} />
                  <Text label="Channel creations" type="number" min="1" max="50" value={drafts.security.antiNuke.thresholds.channelCreate} onChange={value => set('security', data => (data.antiNuke.thresholds.channelCreate = value, data))} />
                  <Text label="Role deletions" type="number" min="1" max="25" value={drafts.security.antiNuke.thresholds.roleDelete} onChange={value => set('security', data => (data.antiNuke.thresholds.roleDelete = value, data))} />
                  <Text label="Role creations" type="number" min="1" max="50" value={drafts.security.antiNuke.thresholds.roleCreate} onChange={value => set('security', data => (data.antiNuke.thresholds.roleCreate = value, data))} />
                  <Text label="Dangerous role permission changes" type="number" min="1" max="25" value={drafts.security.antiNuke.thresholds.rolePermissionEscalation} onChange={value => set('security', data => (data.antiNuke.thresholds.rolePermissionEscalation = value, data))} />
                  <Text label="Bans" type="number" min="1" max="50" value={drafts.security.antiNuke.thresholds.memberBan} onChange={value => set('security', data => (data.antiNuke.thresholds.memberBan = value, data))} />
                  <Text label="Kicks" type="number" min="1" max="50" value={drafts.security.antiNuke.thresholds.memberKick} onChange={value => set('security', data => (data.antiNuke.thresholds.memberKick = value, data))} />
                  <Text label="Webhook changes" type="number" min="1" max="25" value={drafts.security.antiNuke.thresholds.webhookUpdate} onChange={value => set('security', data => (data.antiNuke.thresholds.webhookUpdate = value, data))} />
                  <Text label="Bot additions" type="number" min="1" max="10" value={drafts.security.antiNuke.thresholds.botAdd} onChange={value => set('security', data => (data.antiNuke.thresholds.botAdd = value, data))} />
                  <Text label="Server setting changes" type="number" min="1" max="25" value={drafts.security.antiNuke.thresholds.guildUpdate} onChange={value => set('security', data => (data.antiNuke.thresholds.guildUpdate = value, data))} />
                </div>
                </SettingsDisclosure>
                {plan !== 'enterprise' && <div className="notice form-divider">Anti-nuke enforcement is available on Pro+. Your settings will be kept if you configure them before upgrading.</div>}
              </SettingsSection>
            )}

            {activeSection === 'verification' && (
              <SettingsSection id="verification" title="Verification" description="Publish a verification panel and assign member roles safely." guildId={guildId} csrf={session.csrf} section="verification" data={drafts.verification} headerControl={<ModuleToggle label="Enable verification" checked={drafts.verification.enabled} onChange={value => set('verification', data => (data.enabled = value, data))} />}>
                <div className="workspace-summary access-summary"><div><span className="workspace-summary-label">Member access</span><strong className={drafts.verification.enabled ? 'summary-good' : 'summary-muted'}>{drafts.verification.enabled ? 'Enabled' : 'Not enabled'}</strong><p>{drafts.verification.enabled ? 'New members can complete the configured verification flow.' : 'Members currently join without a ModerationDesk verification gate.'}</p></div><div><span className="workspace-summary-label">Method</span><strong>{drafts.verification.mode === 'oauth' ? 'Discord OAuth' : 'Button'}</strong><p>How members complete verification.</p></div><div><span className="workspace-summary-label">Verified role</span><strong>{roles.find(role => role.id === drafts.verification.verifiedRoleId)?.name || 'Not selected'}</strong><p>Applied after completion.</p></div></div>
                <div className="form-grid">
                  <div><Select label="Mode" value={drafts.verification.mode} onChange={value => set('verification', data => (data.mode = value, data))}><option value="button">Discord button</option><option value="oauth">Discord OAuth</option></Select></div>
                  <ChannelSelect label="Verification channel" value={drafts.verification.channelId} channels={channels} onChange={value => set('verification', data => (data.channelId = value, data))} />
                  <RoleSelect label="Verified role" value={drafts.verification.verifiedRoleId} roles={roles} onChange={value => set('verification', data => (data.verifiedRoleId = value, data))} />
                  <RoleSelect label="Unverified role" value={drafts.verification.unverifiedRoleId} roles={roles} onChange={value => set('verification', data => (data.unverifiedRoleId = value, data))} />
                  <div className="full"><Area label="Panel message" value={drafts.verification.message} onChange={value => set('verification', data => (data.message = value, data))} /></div>
                </div>
              </SettingsSection>
            )}

            {activeSection === 'billing' && (
              <section className="card settings-section" id="billing">
                <div className="settings-header"><div><span className="settings-kicker">Account</span><h2>Plan & billing</h2><p>Every subscription belongs to this Discord server, so the full moderation team benefits.</p></div><span className="badge">{planLabel(plan)}</span></div>
                <div className="settings-body">
                  <div className="billing-summary"><span>Current plan</span><strong>{planLabel(plan)}</strong><small>{guild.config.billing.provider === 'discord' ? 'Managed securely through Discord' : 'No Discord subscription linked yet'}</small></div>
                  {guild.discordBilling?.configured ? <div className="billing-plan-grid">
                    <article className={plan === 'free' ? 'current' : ''}><div><span>Free</span><strong>$0</strong><small>Essential controls</small></div><p>Cases, structured logs, welcome messages and basic message screening.</p>{plan === 'free' ? <b>Current plan</b> : <a className="button ghost small" href={guild.discordBilling.store} target="_blank" rel="noreferrer">Manage in Discord</a>}</article>
                    <article className={plan === 'pro' ? 'current' : ''}><div><span>Pro</span><strong>$3.99</strong><small>per server / month</small></div><p>Advanced screening, anti-raid, OAuth verification, appeals and granular logs.</p>{plan === 'pro' ? <b>Current plan</b> : <a className="button small" href={guild.discordBilling.pro} target="_blank" rel="noreferrer">Choose Pro</a>}</article>
                    <article className={plan === 'enterprise' ? 'current' : ''}><div><span>Pro+</span><strong>$7.99</strong><small>per server / month</small></div><p>Anti-nuke enforcement, migration, role restoration and full protection controls.</p>{plan === 'enterprise' ? <b>Current plan</b> : <a className="button secondary small" href={guild.discordBilling.enterprise} target="_blank" rel="noreferrer">Choose Pro+</a>}</article>
                  </div> : <div className="notice">Discord subscriptions are being prepared. Once the two subscription SKUs are published, this page will link directly to the Discord purchase flow for this server.</div>}
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
