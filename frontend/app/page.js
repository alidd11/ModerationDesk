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
  ['01', 'See the whole incident', 'Cases, staff actions and the relevant history stay in one record, so a moderator can understand what happened without hunting through several bots.'],
  ['02', 'Choose the right safeguard', 'Message screening, raid response and destructive-action protection are separate controls with a clear purpose and owner.'],
  ['03', 'Give members a predictable route in', 'Verification, roles and appeals live alongside moderation—not as another disconnected workflow.']
];

export default function Home() {
  return (
    <Shell>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-overline"><span>ModerationDesk</span><i aria-hidden="true" /><span>A DeskLabs product</span></div>
          <h1>Moderation that stays clear when the server gets busy.</h1>
          <p>One workspace for moderation, protection and member access. Your team can see what happened, what needs attention and what to do next.</p>
          <div className="landing-actions">
            <a className="button button-large" href={botInviteUrl} target="_blank" rel="noreferrer">Add to Discord <span aria-hidden="true">→</span></a>
            <Link className="landing-link" href="/dashboard">Explore the dashboard <span aria-hidden="true">→</span></Link>
          </div>
          <dl className="landing-signals">
            <div><dt>Built for</dt><dd>Staff teams</dd></div>
            <div><dt>Identity</dt><dd>Discord OAuth</dd></div>
            <div><dt>Data</dt><dd>Clear controls</dd></div>
          </dl>
        </div>

        <div className="workspace-preview" aria-label="Illustrative ModerationDesk workspace preview">
          <div className="workspace-preview-bar">
            <div className="workspace-preview-brand"><Image src="/brand/moderationdesk-mark.png" width={28} height={28} alt="" /><span>ModerationDesk</span></div>
            <span>LIVE WORKSPACE</span>
          </div>
          <div className="workspace-preview-main">
            <div className="workspace-preview-heading"><div><small>SERVER</small><strong>DeskLab</strong><span><i aria-hidden="true" /> Connected</span></div><button type="button">Open Discord ↗</button></div>
            <div className="workspace-preview-score"><div><span>Workspace readiness</span><strong>4 of 5</strong></div><p>One essential control remains before this server is fully configured.</p></div>
            <div className="workspace-preview-list">
              {[['Staff access', 'Ready'], ['Event logging', 'Ready'], ['AutoMod', 'Set up'], ['Verification', 'Ready']].map(([name, state]) => <div key={name}><span><i className={state === 'Set up' ? 'pending' : ''} aria-hidden="true" />{name}</span><strong>{state}</strong></div>)}
            </div>
            <div className="workspace-preview-event"><span>Latest activity</span><p><b>AutoMod</b> removed an invite link <small>8m ago</small></p></div>
          </div>
        </div>
      </section>

      <section className="landing-approach" id="platform">
        <div className="landing-approach-intro">
          <span className="section-kicker">ONE WORKSPACE, NOT A BOT PILE</span>
          <h2>Everything your staff needs, in the order they need it.</h2>
          <p>ModerationDesk follows the work your team already does. It is not a long command list or another collection of tools to piece together.</p>
          <Link className="landing-link" href="/platform/overview">See how it fits together <span aria-hidden="true">→</span></Link>
        </div>
        <div className="landing-approach-list">
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

      <section className="landing-close">
        <div><span className="section-kicker">READY WHEN YOUR TEAM IS</span><h2>Set the essentials once. Keep the server under control.</h2><p>Start with a dependable baseline, then add stronger protection when your community needs it.</p></div>
        <div className="landing-actions"><a className="button button-large" href={botInviteUrl} target="_blank" rel="noreferrer">Add to Discord <span aria-hidden="true">→</span></a><Link className="landing-link" href="/dashboard">Explore the dashboard <span aria-hidden="true">→</span></Link></div>
      </section>
    </Shell>
  );
}
