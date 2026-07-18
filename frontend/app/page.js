import Link from 'next/link';
import Shell from '../components/Shell';

const features = [
  ['01', 'Moderation workspace', 'Warnings, timeouts, temporary bans, staff notes and a complete case history in one place.'],
  ['02', 'Always-on protection', 'Stop spam, malicious links, mass mentions, raids and destructive server actions automatically.'],
  ['03', 'Trusted verification', 'Button and OAuth verification with consent-based migration and safe role restoration.'],
  ['04', 'Multi-server control', 'Run every community from one dashboard with isolated settings and granular staff access.']
];

export default function Home() {
  return (
    <Shell>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><i /> The all-in-one Discord operations platform</span>
          <h1>Run your community.<br /><em>Without the chaos.</em></h1>
          <p>Replace a stack of disconnected bots with one focused platform for moderation, security, verification, appeals and community operations.</p>
          <div className="hero-actions">
            <a className="button button-large" href="/api/auth/login">Start with Discord <span>→</span></a>
            <Link className="text-link" href="#platform">See what’s included <span>↓</span></Link>
          </div>
          <div className="trust-row"><span>✓ No user tokens</span><span>✓ Consent-based OAuth</span><span>✓ Per-server settings</span></div>
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
      <section className="logo-strip"><span>Built to replace</span><b>Dyno</b><b>Carl-bot</b><b>Wick</b><b>MEE6</b><b>YAGPDB</b></section>
      <section className="section platform" id="platform">
        <div className="section-kicker">THE PLATFORM</div>
        <div className="section-head"><div><h2>Everything your staff needs.<br />Nothing they don’t.</h2></div><p>Powerful tools should feel calm, clear and predictable—even when your server is not.</p></div>
        <div className="feature-grid">
          {features.map(([number, title, text]) => <article className="feature-card" key={title}><span>{number}</span><h3>{title}</h3><p>{text}</p><i aria-hidden="true">↗</i></article>)}
        </div>
      </section>
      <section className="cta"><div><span className="eyebrow"><i /> READY WHEN YOU ARE</span><h2>Your community deserves one reliable control centre.</h2><p>Connect Discord, choose a server and configure ModerationDesk in minutes.</p></div><a className="button button-large" href="/api/auth/login">Open your dashboard <span>→</span></a></section>
    </Shell>
  );
}
