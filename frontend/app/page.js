import Image from 'next/image';
import Shell from '../components/Shell';

const botInviteUrl = 'https://discord.com/oauth2/authorize?client_id=1528046559923666944&permissions=1099914374358&scope=bot%20applications.commands';

const featureGroups = [
  {
    number: '01',
    label: 'Moderation',
    title: 'A case record the whole staff team can follow.',
    text: 'Warnings, timeouts, bans, notes and appeal decisions stay attached to the member, with reasons and staff ownership preserved.',
    items: ['Case history', 'Warnings and staff notes', 'Temporary actions', 'Appeal records']
  },
  {
    number: '02',
    label: 'Protection',
    title: 'Separate controls for everyday abuse and serious attacks.',
    text: 'Tune message filters, join-spike detection and destructive-action protection independently instead of relying on one opaque safety switch.',
    items: ['Spam and duplicate filters', 'Invite and link controls', 'Anti-raid thresholds', 'Anti-nuke enforcement']
  },
  {
    number: '03',
    label: 'Access',
    title: 'Verification and role continuity without shortcuts.',
    text: 'Use button or OAuth verification, configure member roles and restore mapped roles during migrations with individual consent.',
    items: ['Button verification', 'Discord OAuth', 'Auto and sticky roles', 'Consent-based migration']
  }
];

const coverage = [
  ['Staff access', 'Choose moderator and administrator roles without handing out broader Discord permissions.'],
  ['Structured logging', 'Route moderation, security, message, member, server and appeal events separately.'],
  ['Member messages', 'Configure welcome and goodbye messages with server and member variables.'],
  ['Community tools', 'Run suggestions, public appeals and a starboard from the same control panel.'],
  ['Permission health', 'See whether the bot has the Discord permissions needed to do its job.'],
  ['Data controls', 'Export the server record or remove stored data from the dashboard.']
];

const plans = [
  { name: 'Free', description: 'The essentials for a growing moderation team.', items: ['Core moderation', 'Cases and warnings', 'Structured logs', 'Basic AutoMod'] },
  { name: 'Pro', description: 'More automation and stronger member protection.', items: ['Everything in Free', 'Advanced AutoMod', 'Anti-raid', 'OAuth verification', 'Web appeals'] },
  { name: 'Enterprise', description: 'High-risk protection and managed migrations.', items: ['Everything in Pro', 'Anti-nuke enforcement', 'Consent-based migration', 'Role restoration'] }
];

export default function Home() {
  return (
    <Shell>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow"><i aria-hidden="true" /> A DESKLABS PRODUCT</span>
          <h1>Run Discord moderation from one control room.</h1>
          <p>Cases, logs, AutoMod, raid protection, verification and role continuity—configured together, without a pile of disconnected bots.</p>
          <div className="hero-actions">
            <a className="button button-large" href={botInviteUrl} target="_blank" rel="noreferrer">Add to Discord <span aria-hidden="true">→</span></a>
            <a className="button ghost button-large" href="/dashboard">Open dashboard</a>
          </div>
          <div className="hero-assurances"><span>Discord OAuth</span><span>No user tokens</span><span>Export and deletion controls</span></div>
        </div>

        <div className="dashboard-product-shot" aria-label="Illustrative ModerationDesk dashboard preview">
          <div className="shot-topbar">
            <div className="shot-brand"><Image src="/brand/moderationdesk-mark.png" width={28} height={28} alt="" /><span>ModerationDesk</span></div>
            <span className="shot-preview-label">Product preview</span>
          </div>
          <div className="shot-layout">
            <aside className="shot-sidebar">
              <small>SERVER</small>
              <div className="active">Overview</div>
              <small>SETUP</small>
              <div>Staff access</div><div>Logging</div><div>Roles</div>
              <small>PROTECTION</small>
              <div>AutoMod</div><div>Anti-raid</div><div>Verification</div>
            </aside>
            <div className="shot-content">
              <div className="shot-heading"><div><small>YOUR COMMUNITY</small><strong>Server overview</strong></div><span><i /> Connected</span></div>
              <div className="shot-metrics">
                <article><span>BOT PERMISSIONS</span><strong>8 / 8</strong><small>Ready</small></article>
                <article><span>AUTOMOD</span><strong>On</strong><small>Message protection</small></article>
                <article><span>VERIFICATION</span><strong>On</strong><small>Member access</small></article>
              </div>
              <div className="shot-panel">
                <div className="shot-panel-head"><strong>Protection status</strong><small>Live configuration</small></div>
                {[['AutoMod','Enabled'],['Anti-raid','Ready'],['Anti-nuke','Enterprise'],['Verification','Enabled']].map(([name, state], index) => <div className="shot-row" key={name}><span><i className={index === 2 ? 'muted' : ''} />{name}</span><small>{state}</small></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Platform principles">
        <span>Built for Discord moderation teams</span>
        <span>Dashboard and slash commands</span>
        <span>Consent-based verification</span>
        <span>Clear, separate security controls</span>
      </section>

      <section className="product-intro" id="platform">
        <div className="product-intro-copy">
          <span className="section-kicker">THE PLATFORM</span>
          <h2>Less switching. Better decisions.</h2>
          <p>ModerationDesk keeps routine moderation, automated enforcement and server protection in the same operational record. Staff know what happened, why it happened and which system acted.</p>
        </div>
        <div className="product-principles">
          <div><strong>Visible</strong><span>Every protection layer has a clear status and its own settings.</span></div>
          <div><strong>Accountable</strong><span>Cases, reasons and staff actions remain available for review.</span></div>
          <div><strong>Controlled</strong><span>Server owners choose roles, channels, thresholds and exemptions.</span></div>
        </div>
      </section>

      <section className="feature-bands" id="security">
        {featureGroups.map(group => (
          <article className="feature-band" key={group.number}>
            <div className="feature-band-label"><span>{group.number}</span><small>{group.label}</small></div>
            <div className="feature-band-copy"><h2>{group.title}</h2><p>{group.text}</p></div>
            <ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
        ))}
      </section>

      <section className="coverage-section">
        <div className="section-head coverage-head"><div><span className="section-kicker">DAY-TO-DAY CONTROL</span><h2>The supporting work is covered too.</h2></div><p>A serious moderation product needs more than punishment commands. These controls keep the surrounding workflow in one place.</p></div>
        <div className="coverage-grid">
          {coverage.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="workflow-section">
        <div className="workflow-copy"><span className="section-kicker">GET STARTED</span><h2>From invite to working setup.</h2><p>The dashboard checks your real Discord roles, channels and bot permissions. No IDs to memorise and no configuration copied between unrelated bots.</p></div>
        <ol className="workflow-steps">
          <li><span>01</span><div><strong>Add ModerationDesk</strong><p>Invite the bot with the permissions required for the modules you plan to use.</p></div></li>
          <li><span>02</span><div><strong>Choose your server</strong><p>Sign in with Discord and open a server where you have Manage Server permission.</p></div></li>
          <li><span>03</span><div><strong>Configure by module</strong><p>Set staff access first, then enable logging, protection and member features as needed.</p></div></li>
        </ol>
      </section>

      <section className="plans-section" id="plans">
        <div className="section-head"><div><span className="section-kicker">PLANS</span><h2>Start with the controls you need.</h2></div><p>Features are grouped by operational need, with advanced protection kept separate from everyday moderation.</p></div>
        <div className="plan-grid">
          {plans.map((plan, index) => <article className={index === 1 ? 'featured' : ''} key={plan.name}><div className="plan-name"><h3>{plan.name}</h3>{index === 1 && <span>Most teams</span>}</div><p>{plan.description}</p><ul>{plan.items.map(item => <li key={item}>{item}</li>)}</ul><a className={`button ${index === 1 ? '' : 'ghost'}`} href={index === 0 ? botInviteUrl : '/dashboard'}>{index === 0 ? 'Add to Discord' : `Choose ${plan.name}`}</a></article>)}
        </div>
      </section>

      <section className="final-cta">
        <div><span className="section-kicker">MODERATIONDESK</span><h2>One place to run a safer server.</h2><p>Bring moderation, protection and member access into one working system.</p></div>
        <div className="hero-actions"><a className="button button-large" href={botInviteUrl} target="_blank" rel="noreferrer">Add to Discord <span aria-hidden="true">→</span></a><a className="button ghost button-large" href="/dashboard">Open dashboard</a></div>
      </section>
    </Shell>
  );
}
