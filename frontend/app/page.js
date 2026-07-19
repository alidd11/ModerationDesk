import Image from 'next/image';
import Shell from '../components/Shell';
import ProductDirectory from '../components/ProductDirectory';

const botInviteUrl = 'https://discord.com/oauth2/authorize?client_id=1528046559923666944&permissions=1099914374358&scope=bot%20applications.commands';
const discordStoreUrl = 'https://discord.com/application-directory/1528046559923666944/store';

const plans = [
  { name: 'Free', price: '$0', cadence: 'forever', description: 'Everything a new moderation team needs to get organised.', items: ['Core moderation and cases', 'Structured event logs', 'Welcome messages and one auto role', 'Essential message screening'] },
  { name: 'Pro', price: '$3.99', cadence: 'per server / month', description: 'Automation and protection for active community teams.', items: ['Everything in Free', 'Advanced message screening', 'Anti-raid and Join Gate', 'OAuth verification and appeals', 'Per-event log routing'] },
  { name: 'Pro+', price: '$7.99', cadence: 'per server / month', description: 'Full protection for communities that need stronger safeguards.', items: ['Everything in Pro', 'Anti-nuke containment', 'Role restoration and migration', 'Full protection policy controls', 'Priority configuration limits'] }
];

export default function Home() {
  return (
    <Shell>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow"><i aria-hidden="true" /> MODERATION FOR DISCORD TEAMS</span>
          <h1>Give your moderators a clearer way to run the server.</h1>
          <p>Keep cases, logs, AutoMod, raid protection and member access in one place—so your team can act quickly and see what happened afterwards.</p>
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
                {[['AutoMod','Enabled'],['Anti-raid','Ready'],['Anti-nuke','Pro+'],['Verification','Enabled']].map(([name, state], index) => <div className="shot-row" key={name}><span><i className={index === 2 ? 'muted' : ''} />{name}</span><small>{state}</small></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Platform principles">
        <span>Made for busy moderation teams</span>
        <span>Dashboard plus slash commands</span>
        <span>Member-friendly verification</span>
        <span>Controls you can explain</span>
      </section>

      <ProductDirectory />

      <section className="plans-section" id="plans">
        <div className="section-head"><div><span className="section-kicker">PLANS</span><h2>Start with the controls you need.</h2></div><p>Features are grouped by operational need, with advanced protection kept separate from everyday moderation.</p></div>
        <div className="plan-grid">
          {plans.map((plan, index) => <article className={index === 1 ? 'featured' : ''} key={plan.name}><div className="plan-name"><h3>{plan.name}</h3>{index === 1 && <span>Most teams</span>}</div><div className="plan-price"><strong>{plan.price}</strong><span>{plan.cadence}</span></div><p>{plan.description}</p><ul>{plan.items.map(item => <li key={item}>{item}</li>)}</ul><a className={`button ${index === 1 ? '' : 'ghost'}`} href={index === 0 ? botInviteUrl : discordStoreUrl} target={index === 0 ? '_blank' : undefined} rel={index === 0 ? 'noreferrer' : undefined}>{index === 0 ? 'Add to Discord' : `Choose ${plan.name}`}</a></article>)}
        </div>
      </section>

      <section className="final-cta">
        <div><span className="section-kicker">MODERATIONDESK</span><h2>One place to run a safer server.</h2><p>Bring moderation, protection and member access into one working system.</p></div>
        <div className="hero-actions"><a className="button button-large" href={botInviteUrl} target="_blank" rel="noreferrer">Add to Discord <span aria-hidden="true">→</span></a><a className="button ghost button-large" href="/dashboard">Open dashboard</a></div>
      </section>
    </Shell>
  );
}
