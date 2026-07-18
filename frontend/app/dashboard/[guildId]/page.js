'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import SettingsSection from '../../../components/SettingsSection';
import { Area, ChannelSelect, Check, Multi, RoleSelect, Select, Text } from '../../../components/Fields';
import { api } from '../../../lib/api';

const copy = value => JSON.parse(JSON.stringify(value));

export default function GuildDashboardPage() {
  const { guildId } = useParams();
  const [session, setSession] = useState(null);
  const [guild, setGuild] = useState(null);
  const [drafts, setDrafts] = useState(null);
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
          automod: { ...cfg.automod, blockedWords: cfg.automod.blockedWords.join('\n'), allowedDomains: cfg.automod.allowedDomains.join('\n'), allowedInviteCodes: cfg.automod.allowedInviteCodes.join('\n') },
          security: cfg.security,
          verification: cfg.verification
        });
      })
      .catch(error => setError(error.status === 401 ? 'Sign in to manage this server.' : error.message));
  }, [guildId]);

  const set = (section, updater) => setDrafts(current => ({ ...current, [section]: updater(copy(current[section])) }));
  const plan = guild?.config?.plan || 'free';
  const menu = useMemo(() => ['overview', 'general', 'automod', 'security', 'verification', 'billing', 'data'], []);

  async function billing(path, body = {}) {
    setBillingBusy(true);
    try {
      const result = await api(`/api/guilds/${guildId}/billing/${path}`, { method: 'POST', headers: { 'X-CSRF-Token': session.csrf }, body: JSON.stringify(body) });
      window.location.href = result.url;
    } catch (error) {
      setError(error.message);
      setBillingBusy(false);
    }
  }

  async function deleteData() {
    try {
      await api(`/api/guilds/${guildId}/data`, { method: 'DELETE', headers: { 'X-CSRF-Token': session.csrf }, body: JSON.stringify({ confirmation: danger }) });
      window.location.href = '/dashboard';
    } catch (error) {
      setError(error.message);
    }
  }

  if (error && !guild) return <Shell><section className="section"><div className="error">{error}</div><p><a className="button" href={`/api/auth/login?returnTo=/dashboard/${guildId}`}>Sign in with Discord</a></p></section></Shell>;
  if (!guild || !drafts || !session) return <Shell><section className="section"><div className="card skeleton">Loading server configuration…</div></section></Shell>;

  const channels = guild.channels;
  const roles = guild.roles;

  return (
    <Shell>
      <div className="dashboard-layout">
        <aside className="sidebar card">
          {menu.map(item => <a href={`#${item}`} key={item}>{item[0].toUpperCase() + item.slice(1)}</a>)}
        </aside>
        <div className="content-stack">
          <section className="card" id="overview">
            <div className="guild-card">
              {guild.icon ? <img className="guild-icon" src={guild.icon} alt="" /> : <div className="guild-icon">{guild.name.slice(0, 2).toUpperCase()}</div>}
              <div className="grow"><h1>{guild.name}</h1><p>{guild.memberCount.toLocaleString()} members</p></div>
              <span className="badge">{plan}</span>
            </div>
            {error && <div className="error" style={{ marginTop: 14 }}>{error}</div>}
          </section>

          <SettingsSection id="general" title="General" description="Staff access, logging, member messages and community utilities." guildId={guildId} csrf={session.csrf} section="general" data={drafts.general}>
            <div className="form-grid">
              <Multi label="Staff roles" help="Roles allowed to use staff-level commands." values={drafts.general.staffRoleIds} options={roles} onChange={value => set('general', data => (data.staffRoleIds = value, data))} />
              <Multi label="Administrator roles" help="Roles allowed to change protected configuration." values={drafts.general.adminRoleIds} options={roles} onChange={value => set('general', data => (data.adminRoleIds = value, data))} />
              <ChannelSelect label="Moderation log" value={drafts.general.logs.moderation} channels={channels} onChange={value => set('general', data => (data.logs.moderation = value, data))} />
              <ChannelSelect label="Security log" value={drafts.general.logs.security} channels={channels} onChange={value => set('general', data => (data.logs.security = value, data))} />
              <ChannelSelect label="Message log" value={drafts.general.logs.messages} channels={channels} onChange={value => set('general', data => (data.logs.messages = value, data))} />
              <ChannelSelect label="Server log" value={drafts.general.logs.server} channels={channels} onChange={value => set('general', data => (data.logs.server = value, data))} />
              <ChannelSelect label="Member log" value={drafts.general.logs.member} channels={channels} onChange={value => set('general', data => (data.logs.member = value, data))} />
              <ChannelSelect label="Appeal log" value={drafts.general.logs.appeals} channels={channels} onChange={value => set('general', data => (data.logs.appeals = value, data))} />
              <div><Check label="Enable welcome messages" checked={drafts.general.welcome.enabled} onChange={value => set('general', data => (data.welcome.enabled = value, data))} /><ChannelSelect label="Welcome channel" value={drafts.general.welcome.channelId} channels={channels} onChange={value => set('general', data => (data.welcome.channelId = value, data))} /></div>
              <Area label="Welcome message" help="Supports {user}, {server} and {count}." value={drafts.general.welcome.message} onChange={value => set('general', data => (data.welcome.message = value, data))} />
              <div><Check label="Enable goodbye messages" checked={drafts.general.goodbye.enabled} onChange={value => set('general', data => (data.goodbye.enabled = value, data))} /><ChannelSelect label="Goodbye channel" value={drafts.general.goodbye.channelId} channels={channels} onChange={value => set('general', data => (data.goodbye.channelId = value, data))} /></div>
              <Area label="Goodbye message" help="Supports {username} and {server}." value={drafts.general.goodbye.message} onChange={value => set('general', data => (data.goodbye.message = value, data))} />
              <Multi label="Auto roles" help="Free supports one role. Paid plans support up to ten." values={drafts.general.autoroles} options={roles} onChange={value => set('general', data => (data.autoroles = value, data))} />
              <Multi label="Sticky roles" help="Restored when a returning member rejoins." values={drafts.general.stickyRoles.roleIds} options={roles} onChange={value => set('general', data => (data.stickyRoles.roleIds = value, data))} />
              <div><Check label="Enable sticky roles" checked={drafts.general.stickyRoles.enabled} onChange={value => set('general', data => (data.stickyRoles.enabled = value, data))} /><Check label="Enable suggestions" checked={drafts.general.suggestions.enabled} onChange={value => set('general', data => (data.suggestions.enabled = value, data))} /><ChannelSelect label="Suggestions channel" value={drafts.general.suggestions.channelId} channels={channels} onChange={value => set('general', data => (data.suggestions.channelId = value, data))} /></div>
              <div><Check label="Enable appeals" checked={drafts.general.appeals.enabled} onChange={value => set('general', data => (data.appeals.enabled = value, data))} /><ChannelSelect label="Appeals channel" value={drafts.general.appeals.channelId} channels={channels} onChange={value => set('general', data => (data.appeals.channelId = value, data))} /></div>
              <div><Check label="Enable starboard" checked={drafts.general.starboard.enabled} onChange={value => set('general', data => (data.starboard.enabled = value, data))} /><ChannelSelect label="Starboard channel" value={drafts.general.starboard.channelId} channels={channels} onChange={value => set('general', data => (data.starboard.channelId = value, data))} /></div>
              <div className="form-grid"><Text label="Star emoji" value={drafts.general.starboard.emoji} onChange={value => set('general', data => (data.starboard.emoji = value, data))} /><Text label="Threshold" type="number" min="1" max="100" value={drafts.general.starboard.threshold} onChange={value => set('general', data => (data.starboard.threshold = value, data))} /></div>
            </div>
          </SettingsSection>

          <SettingsSection id="automod" title="AutoMod" description="Message filtering and escalating automated sanctions." guildId={guildId} csrf={session.csrf} section="automod" data={drafts.automod}>
            <div className="form-grid">
              <div><Check label="Enable AutoMod" checked={drafts.automod.enabled} onChange={value => set('automod', data => (data.enabled = value, data))} /><Check label="Block Discord invites" checked={drafts.automod.antiInvites} onChange={value => set('automod', data => (data.antiInvites = value, data))} /><Check label="Block non-allowlisted links" checked={drafts.automod.antiLinks} onChange={value => set('automod', data => (data.antiLinks = value, data))} /><Check label="Detect spam" checked={drafts.automod.antiSpam} onChange={value => set('automod', data => (data.antiSpam = value, data))} /></div>
              <div><Check label="Detect duplicate messages" checked={drafts.automod.antiDuplicates} onChange={value => set('automod', data => (data.antiDuplicates = value, data))} /><Check label="Detect mass mentions" checked={drafts.automod.antiMassMentions} onChange={value => set('automod', data => (data.antiMassMentions = value, data))} /><Check label="Detect excessive capitals" checked={drafts.automod.antiCaps} onChange={value => set('automod', data => (data.antiCaps = value, data))} /></div>
              <Select label="Action" value={drafts.automod.action} onChange={value => set('automod', data => (data.action = value, data))}><option value="delete">Delete only</option><option value="warn">Delete and warn</option><option value="timeout">Delete and timeout</option></Select>
              <Text label="Timeout seconds" type="number" min="10" max="2419200" value={drafts.automod.timeoutSeconds} onChange={value => set('automod', data => (data.timeoutSeconds = value, data))} />
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

          <SettingsSection id="security" title="Security" description="Raid response and destructive-action protection." guildId={guildId} csrf={session.csrf} section="security" data={drafts.security}>
            <div className="form-grid">
              <div><Check label="Enable anti-raid" checked={drafts.security.antiRaid.enabled} onChange={value => set('security', data => (data.antiRaid.enabled = value, data))} /><Text label="Join threshold" type="number" min="3" max="100" value={drafts.security.antiRaid.joinThreshold} onChange={value => set('security', data => (data.antiRaid.joinThreshold = value, data))} /><Text label="Window seconds" type="number" min="5" max="300" value={drafts.security.antiRaid.windowSeconds} onChange={value => set('security', data => (data.antiRaid.windowSeconds = value, data))} /></div>
              <div><Text label="Auto-unlock minutes" type="number" min="1" max="1440" value={drafts.security.antiRaid.autoUnlockMinutes} onChange={value => set('security', data => (data.antiRaid.autoUnlockMinutes = value, data))} /><Text label="Minimum account age days" type="number" min="0" max="3650" value={drafts.security.antiRaid.minimumAccountAgeDays} onChange={value => set('security', data => (data.antiRaid.minimumAccountAgeDays = value, data))} /><RoleSelect label="Quarantine role" value={drafts.security.antiRaid.quarantineRoleId} roles={roles} onChange={value => set('security', data => (data.antiRaid.quarantineRoleId = value, data))} /></div>
              <div><Check label="Enable anti-nuke" checked={drafts.security.antiNuke.enabled} onChange={value => set('security', data => (data.antiNuke.enabled = value, data))} /><Check label="Restore deleted channels and roles" checked={drafts.security.antiNuke.restoreDeletedObjects} onChange={value => set('security', data => (data.antiNuke.restoreDeletedObjects = value, data))} /><Select label="Enforcement action" value={drafts.security.antiNuke.action} onChange={value => set('security', data => (data.antiNuke.action = value, data))}><option value="strip_roles">Strip dangerous roles</option><option value="ban">Ban executor</option></Select></div>
              <Multi label="Trusted roles" values={drafts.security.antiNuke.trustedRoleIds} options={roles} onChange={value => set('security', data => (data.antiNuke.trustedRoleIds = value, data))} />
            </div>
            {plan !== 'enterprise' && <div className="notice">Anti-nuke enforcement is available on Enterprise. The dashboard preserves your other security settings.</div>}
          </SettingsSection>

          <SettingsSection id="verification" title="Verification" description="Publish a verification panel and assign member roles safely." guildId={guildId} csrf={session.csrf} section="verification" data={drafts.verification}>
            <div className="form-grid">
              <div><Check label="Enable verification" checked={drafts.verification.enabled} onChange={value => set('verification', data => (data.enabled = value, data))} /><Select label="Mode" value={drafts.verification.mode} onChange={value => set('verification', data => (data.mode = value, data))}><option value="button">Discord button</option><option value="oauth">Discord OAuth</option></Select></div>
              <ChannelSelect label="Verification channel" value={drafts.verification.channelId} channels={channels} onChange={value => set('verification', data => (data.channelId = value, data))} />
              <RoleSelect label="Verified role" value={drafts.verification.verifiedRoleId} roles={roles} onChange={value => set('verification', data => (data.verifiedRoleId = value, data))} />
              <RoleSelect label="Unverified role" value={drafts.verification.unverifiedRoleId} roles={roles} onChange={value => set('verification', data => (data.unverifiedRoleId = value, data))} />
              <div className="full"><Area label="Panel message" value={drafts.verification.message} onChange={value => set('verification', data => (data.message = value, data))} /></div>
            </div>
          </SettingsSection>

          <section className="card" id="billing"><h2>Billing</h2><p>Current plan: <strong>{plan.toUpperCase()}</strong>. Billing status: {guild.config.billing.status || 'not linked'}.</p>{guild.billingConfigured ? <div className="form-actions">{guild.config.billing.linked ? <button className="button secondary" disabled={billingBusy} onClick={() => billing('portal')}>Manage billing</button> : <><button className="button" disabled={billingBusy} onClick={() => billing('checkout', { plan: 'pro' })}>Subscribe to Pro</button><button className="button secondary" disabled={billingBusy} onClick={() => billing('checkout', { plan: 'enterprise' })}>Subscribe to Enterprise</button></>}</div> : <div className="notice">Stripe is not configured on the Railway service. Plans can still be assigned through the protected admin API.</div>}</section>

          <section className="card" id="data"><h2>Data controls</h2><p>Export the server configuration, moderation records, appeals and migration records stored by ModerationDesk.</p><div className="form-actions"><a className="button secondary" href={`/api/guilds/${guildId}/export`}>Download JSON export</a><a className="button ghost" href={guild.appealUrl}>Open public appeal page</a></div></section>

          <section className="card danger-zone"><h2>Delete stored server data</h2><p>This removes ModerationDesk configuration, cases, warnings, notes, appeals and migration records. It does not delete Discord messages or roles.</p><Text label="Type the server ID to confirm" value={danger} onChange={setDanger} placeholder={guildId} /><div className="form-actions"><button className="button danger" disabled={danger !== guildId} onClick={deleteData}>Delete all stored data</button></div></section>
        </div>
      </div>
    </Shell>
  );
}
