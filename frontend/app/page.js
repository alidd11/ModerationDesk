import Shell from '../components/Shell';

const botInviteUrl = 'https://discord.com/oauth2/authorize?client_id=1528046559923666944&permissions=1099914374358&scope=bot%20applications.commands';

const features = [
  ['01', 'Cases that keep context', 'Warnings, timeouts, temporary bans and staff notes stay together in a complete member history.'],
  ['02', 'Protection that stays on', 'Spam, malicious links, mass mentions, raids and destructive actions are handled automatically.'],
  ['03', 'Verification you can trust', 'Button and OAuth verification support consent-based migration and safe role restoration.'],
  ['04', 'One dashboard, every server', 'Manage every community with isolated settings and granular access for your staff team.']
];

export default function Home() {
  return (
    <Shell>
      <section className="hero">
        <div className="hero-copy">
          <h1>Turn Discord into a safer community.</h1>
          <p>Moderation, security and verification—configured from a dashboard instead of a wall of commands or a stack of disconnected bots.</p>
          <div className="hero-actions">
            <a className="button button-large" href="/api/auth/login">Open dashboard <span>→</span></a>
          </div>
        </div>
        <div className="product-window" aria-label="ModerationDesk dashboard preview">
          <div className="window-bar"><span /><span /><span /><small>Control centre</small></div>
          <div className="window-body">
            <div className="preview-sidebar"><div className="preview-logo">M</div>{['Overview','Moderation','AutoMod','Security','Verification'].map((item, index) => <div className={index === 0 ? 'active' : ''} key={item}><i />{item}</div>)}</div>
            <div className="preview-main">
              <div className="preview-heading"><div><small>DESKLABS COMMUNITY</small><strong>Good evening, Ali</strong></div><span className="status-dot">All systems operational</span></div>
              <div className="preview-stats"><div><small>MEMBERS</small><b>24,891</b><span>+8.2% this month</span></div><div><small>CASES TODAY</small><b>18</b><span>6 resolved</span></div><div><small>THREATS BLOCKED</small><b>1,204</b><span>Last 30 days</span></div></div>
              <div className="activity-card"><div><strong>Live moderation activity</strong><span>View all</span></div>{[['Timeout','Repeated spam','2m ago'],['AutoMod','Blocked invite link','8m ago'],['Verification','Member verified','12m ago']].map(row => <p key={row[2]}><i /> <b>{row[0]}</b><span>{row[1]}</span><small>{row[2]}</small></p>)}</div>
            </div>
          </div>
        </div>
      </section>
      <section className="family-features" id="security"><article><h3>Moderation that stays organised</h3><p>Every warning, sanction and staff note becomes part of one searchable case history.</p></article><article><h3>Security, built in</h3><p>AutoMod, anti-raid and anti-nuke protection work together instead of competing for events.</p></article><article><h3>Roles that follow safely</h3><p>Verify members and restore mapped roles through an explicit, Discord-compliant consent flow.</p></article></section>
      <section className="section platform" id="platform">
        <div className="section-head"><div><h2>Built for the way moderation teams actually work.</h2></div><p>Configure the rules once, give staff the access they need and keep the full operational history.</p></div>
        <div className="feature-grid">
          {features.map(([number, title, text]) => <article className="feature-card" key={title}><span>{number}</span><h3>{title}</h3><p>{text}</p><i aria-hidden="true">↗</i></article>)}
        </div>
      </section>
      <section className="cta"><div><h2>Build your moderation setup visually.</h2><p>Choose a server, configure each system and see exactly what your staff and members will experience.</p></div><a className="button button-large" href={botInviteUrl} target="_blank" rel="noreferrer">Invite ModerationDesk <span>→</span></a></section>
    </Shell>
  );
}
