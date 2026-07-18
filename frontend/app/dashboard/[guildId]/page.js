'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import SettingsSection from '../../../components/SettingsSection';
import { Area, ChannelSelect, Check, Multi, RoleSelect, Select, Text } from '../../../components/Fields';
import { api } from '../../../lib/api';

const copy = value => JSON.parse(JSON.stringify(value));

const navigation = [
  { label: 'Server', items: [{ id: 'overview', label: 'Overview' }] },
  {
    label: 'Setup',
    items: [
      { id: 'staff-access', label: 'Staff access' },
      { id: 'logging', label: 'Logging' },
      { id: 'member-messages', label: 'Member messages' },
      { id: 'roles', label: 'Roles' },
      { id: 'community', label: 'Community tools' }
    ]
  },
  {
    label: 'Protection',
    items: [
      { id: 'automod', label: 'AutoMod' },
      { id: 'anti-raid', label: 'Anti-raid' },
      { id: 'anti-nuke', label: 'Anti-nuke' },
      { id: 'verification', label: 'Verification' }
    ]
  },
  {
    label: 'Account',
    items: [
      { id: 'billing', label: 'Billing' },
      { id: 'data', label: 'Data & privacy' }
    ]
  }
];

const validSections = new Set(navigation.flatMap(group => group.items.map(item => item.id)));

function Status({ enabled, children }) {
  return <span className={`feature-status ${enabled ? 'enabled' : ''}`}><i aria-hidden="true" />{children}</span>;
}

export default function GuildDashboardPage() {
  const { guildId } = useParams();
  const [session, setSession] = useState(null);
  const [guild, setGuild] = useState(null);
  const [drafts, setDrafts] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [error, setError] = useState('');
  const [danger, setDanger] = useState('');
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    Promise.all([api('/api/auth/session'), api(`/api/guilds/${guildId}`)])
      .then(([sessionData, guildData]) => {
        setSession(sessionData);
        setGuild(guildData.guild);
        const cfg = guildData.guild.config;
        setDrafts({
          general: {
            staffRoleIds: cfg.staffRoleIds,
            adminRoleIds: cfg.adminRoleIds,
            logs: cfg.logs,
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
          verification: cfg.verification
        });
      })
      .catch(error => setError(error.status === 401 ? 'Sign in to manage this server.' : error.message));
  }, [guildId]);

  useEffect(() => {
    const syncSection = () => {
      const requested = window.location.hash.slice(1);
      setActiveSection(validSections.has(requested) ? requested : 'overview');
    };

    syncSection();
    window.addEventListener('hashchange', syncSection);
    return () => window.removeEventListener('hashchange', syncSection);
  }, []);

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
    return <Shell><section className="section"><div className="error">{error}</div><p><a className="button" href={`/api/auth/login?returnTo=/dashboard/${guildId}`}>Sign in with Discord</a></p></section></Shell>;
  }

  if (!guild || !drafts || !session) {
    return <Shell><section className="section"><div className="card skeleton">Loading server configuration…</div></section></Shell>;
  }

  const channels = guild.channels;
  const roles = guild.roles;
  const configuredLogs = Object.values(drafts.general.logs).filter(Boolean).length;

  return (
    <Shell>
      <div className="dashboard-shell">
        <header className="dashboard-heading">
          <div className="guild-card">
            {guild.icon ? <img className="guild-icon" src={guild.icon} alt="" /> : <div className="guild-icon">{guild.name.slice(0, 2).toUpperCase()}</div>}
            <div className="grow">
              <span className="dashboard-kicker">Server control panel</span>
              <h1>{guild.name}</h1>
              <p>{guild.memberCount.toLocaleString()} members</p>
            </div>
          </div>
          <span className="badge">{plan}</span>
        </header>

        {error && <div className="error dashboard-error">{error}</div>}

        <div className="dashboard-layout">
          <aside className="sidebar" aria-label="Server settings">
            {navigation.map(group => (
              <div className="sidebar-group" key={group.label}>
                <div className="sidebar-label">{group.label}</div>
                <nav aria-label={`${group.label} settings`}>
                  {group.items.map(item => (
                    <a
                      className={activeSection === item.id ? 'active' : ''}
                      href={`#${item.id}`}
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      aria-current={activeSection === item.id ? 'page' : undefined}
                    >
                      <span>{item.label}</span>
                      <i aria-hidden="true">›</i>
                    </a>
                  ))}
                </nav>
              </div>
            ))}
          </aside>

          <main className="dashboard-content">
            {activeSection === 'overview' && (
              <section className="card dashboard-overview" id="overview">
                <div className="settings-header">
                  <div><span className="settings-kicker">Overview</span><h2>Server setup</h2><p>A live summary of the settings currently applied to this server.</p></div>
                </div>
                <div className="settings-body">
                  <div className="overview-stats">
                    <article><span>Plan</span><strong>{plan}</strong><small>{guild.config.billing.status || 'Billing not linked'}</small></article>
                    <article><span>Logging</span><strong>{configuredLogs} / 6</strong><small>Channels configured</small></article>
                    <article><span>AutoMod</span><strong>{drafts.automod.enabled ? 'On' : 'Off'}</strong><small>Message protection</small></article>
                    <article><span>Verification</span><strong>{drafts.verification.enabled ? 'On' : 'Off'}</strong><small>Member access</small></article>
                  </div>

                  <div className="overview-panel">
                    <div><h3>Protection status</h3><p>Enable and configure each layer separately from the sidebar.</p></div>
                    <div className="status-list">
                      <Status enabled={drafts.automod.enabled}>AutoMod</Status>
                      <Status enabled={drafts.security.antiRaid.enabled}>Anti-raid</Status>
                      <Status enabled={drafts.security.antiNuke.enabled}>Anti-nuke</Status>
                      <Status enabled={drafts.verification.enabled}>Verification</Status>
                    </div>
                  </div>

                  <div className="overview-panel">
                    <div><h3>Configuration</h3><p>These checks use your live server settings, not sample data.</p></div>
                    <div className="setup-checks">
                      <a href="#staff-access" onClick={() => setActiveSection('staff-access')}><span>Staff access</span><Status enabled={drafts.general.staffRoleIds.length > 0}>{drafts.general.staffRoleIds.length ? 'Configured' : 'Not configured'}</Status></a>
                      <a href="#logging" onClick={() => setActiveSection('logging')}><span>Logging</span><Status enabled={configuredLogs > 0}>{configuredLogs ? `${configuredLogs} channels` : 'Not configured'}</Status></a>
                      <a href="#member-messages" onClick={() => setActiveSection('member-messages')}><span>Member messages</span><Status enabled={drafts.general.welcome.enabled || drafts.general.goodbye.enabled}>{drafts.general.welcome.enabled || drafts.general.goodbye.enabled ? 'Enabled' : 'Disabled'}</Status></a>
                      <a href="#roles" onClick={() => setActiveSection('roles')}><span>Automatic roles</span><Status enabled={drafts.general.autoroles.length > 0}>{drafts.general.autoroles.length ? 'Configured' : 'Not configured'}</Status></a>
                    </div>
                  </div>
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

            {activeSection === 'logging' && (
              <SettingsSection id="logging" title="Logging" description="Send each type of server activity to the right staff channel." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
                <div className="form-grid">
                  <ChannelSelect label="Moderation log" value={drafts.general.logs.moderation} channels={channels} onChange={value => set('general', data => (data.logs.moderation = value, data))} />
                  <ChannelSelect label="Security log" value={drafts.general.logs.security} channels={channels} onChange={value => set('general', data => (data.logs.security = value, data))} />
                  <ChannelSelect label="Message log" value={drafts.general.logs.messages} channels={channels} onChange={value => set('general', data => (data.logs.messages = value, data))} />
                  <ChannelSelect label="Server log" value={drafts.general.logs.server} channels={channels} onChange={value => set('general', data => (data.logs.server = value, data))} />
                  <ChannelSelect label="Member log" value={drafts.general.logs.member} channels={channels} onChange={value => set('general', data => (data.logs.member = value, data))} />
                  <ChannelSelect label="Appeal log" value={drafts.general.logs.appeals} channels={channels} onChange={value => set('general', data => (data.logs.appeals = value, data))} />
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
          </main>
        </div>
      </div>
    </Shell>
  );
}
