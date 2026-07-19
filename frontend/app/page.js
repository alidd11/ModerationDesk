import Image from 'next/image';
import Link from 'next/link';
import Shell from '../components/Shell';

const botInviteUrl = 'https://discord.com/oauth2/authorize?client_id=1528046559923666944&permissions=1099914374358&scope=bot%20applications.commands';
const discordStoreUrl = 'https://discord.com/application-directory/1528046559923666944/store';

const plans = [
  { name: 'Free', price: '$0', cadence: 'forever', description: 'A dependable foundation for a small or new moderation team.', items: ['Core moderation and cases', 'Structured event logging', 'Welcome messages and one auto role', 'Essential message screening'] },
  { name: 'Pro', price: '$3.99', cadence: 'per server / month', description: 'Proactive protection for established, active communities.', items: ['Everything in Free', 'Advanced message screening', 'Anti-raid and Join Gate', 'OAuth verification and appeals', 'Per-event log routing'] },
  { name: 'Pro+', price: '$7.99', cadence: 'per server / month', description: 'Deep safeguards for communities with higher operational risk.', items: ['Everything in Pro', 'Anti-nuke containment', 'Role restoration and migration', 'Full protection policy controls', 'Priority configuration limits'] }
];

const operationalPrinciples = [
  ['01', 'Respond with context', 'Cases, staff actions and the relevant history stay connected, so moderators do not need to piece an incident together from multiple bots.'],
  ['02', 'Configure protection deliberately', 'Message screening, raid response and destructive-action protection remain separate controls with a clear role for each.'],
  ['03', 'Keep member access predictable', 'Verification, roles and appeals are part of the same workspace—not another set of disconnected workflows.']
];

export default function Home() {
  return (
    <Shell>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow"><i aria-hidden="true" /> MODERATIONDESK FOR DISCORD</span>
          <h1>Moderation that holds up when the server gets busy.</h1>
          <p>Give your team a clear view of cases, protection and member access—so they can respond with confidence and explain what happened later.</p>
          <div className="hero-actions">
            <a className="button button-large" href={botInviteUrl} target="_blank" rel="noreferrer">Install on Discord <span aria-hidden="true">→</span></a>
            <a className="button ghost button-large" href="/dashboard">Open workspace</a>
          </div>
          <div className="hero-assurances"><span>Secure Discord OAuth</span><span>No user tokens</span><span>Built-in data controls</span></div>
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
                {[['AutoMod','Enabled'],['Anti-raid','Ready'],['Anti-nuke','Pro+'],['Verification','Enabled']].map(([name, state], index) => <div className="shot-row" key={name}><span><i className={index === 2 ? 'muted' : ''} />{name}</span><small>{state}</small></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="operating-principles" id="platform">
        <div className="operating-principles-intro">
          <span className="section-kicker">THE MODERATIONDESK APPROACH</span>
          <h2>A calmer way to run a complex community.</h2>
          <p>ModerationDesk is designed around the decisions your team makes every day, not a long list of disconnected features.</p>
          <Link className="text-link" href="/platform/overview">Explore the platform <span aria-hidden="true">→</span></Link>
        </div>
        <div className="operating-principles-list">
          {operationalPrinciples.map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}
        </div>
      </section>

      <section className="plans-section" id="plans">
        <div className="section-head"><div><span className="section-kicker">PLANS</span><h2>Pricing that stays straightforward.</h2></div><p>Start with the essentials, then add proactive protection only when your community needs it.</p></div>
        <div className="plan-grid">
          {plans.map((plan, index) => <article className={index === 1 ? 'featured' : ''} key={plan.name}><div className="plan-name"><h3>{plan.name}</h3>{index === 1 && <span>Most teams</span>}</div><div className="plan-price"><strong>{plan.price}</strong><span>{plan.cadence}</span></div><p>{plan.description}</p><ul>{plan.items.map(item => <li key={item}>{item}</li>)}</ul><a className={`button ${index === 1 ? '' : 'ghost'}`} href={index === 0 ? botInviteUrl : discordStoreUrl} target={index === 0 ? '_blank' : undefined} rel={index === 0 ? 'noreferrer' : undefined}>{index === 0 ? 'Install on Discord' : `View ${plan.name} in Discord`}</a></article>)}
        </div>
      </section>

      <section className="desklabs-product" aria-labelledby="ticketdesk-title">
        <div>
          <span className="section-kicker">ANOTHER DESKLABS PRODUCT</span>
          <h2 id="ticketdesk-title">Support conversations deserve the same clarity.</h2>
        </div>
        <div className="desklabs-product-copy">
          <p>TicketDesk gives Discord teams a focused support workspace for private tickets, structured hand-offs and clear customer history.</p>
          <a className="text-link" href="https://ticketdesk.tech/" target="_blank" rel="noreferrer">Explore TicketDesk <span aria-hidden="true">↗</span></a>
        </div>
        <div className="desklabs-product-points" aria-label="TicketDesk highlights"><span>Private support tickets</span><span>Structured staff workflows</span><span>Built for Discord communities</span></div>
      </section>

      <section className="final-cta">
        <div><span className="section-kicker">READY WHEN YOUR TEAM IS</span><h2>Bring your moderation workflow together.</h2><p>Set up the essential controls first, then scale protection as your community grows.</p></div>
        <div className="hero-actions"><a className="button button-large" href={botInviteUrl} target="_blank" rel="noreferrer">Install on Discord <span aria-hidden="true">→</span></a><a className="button ghost button-large" href="/dashboard">Open workspace</a></div>
      </section>
    </Shell>
  );
}
