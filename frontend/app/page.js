import Link from 'next/link';
import Shell from '../components/Shell';

const features = [
  ['Cases and sanctions', 'Warnings, timeouts, tempbans, softbans, notes and complete case history.'],
  ['Automated protection', 'Spam, duplicate, invite, link, mention, caps, raid and destructive-action protection.'],
  ['Verification and appeals', 'Button or OAuth verification, consent-based role restoration and public appeal forms.'],
  ['Operations dashboard', 'Manage multiple Discord servers from one secure dashboard with granular role controls.']
];

export default function Home() {
  return (
    <Shell>
      <section className="hero">
        <div>
          <span className="eyebrow">Built for serious Discord communities</span>
          <h1>Moderation infrastructure that scales with your server.</h1>
          <p>ModerationDesk combines moderation, security, verification, appeals, migration tooling and server operations in one multi-guild platform.</p>
          <div className="hero-actions">
            <a className="button" href="/api/auth/login">Open dashboard</a>
            <Link className="button secondary" href="#features">Explore the platform</Link>
          </div>
        </div>
        <div className="hero-card">
          <span className="badge good">Production architecture</span>
          <h2>Railway bot and API. Vercel control centre.</h2>
          <p>The Discord gateway stays connected on Railway while the responsive dashboard runs independently on Vercel.</p>
          <div className="metric-grid">
            <div className="metric"><strong>13</strong><span>command groups</span></div>
            <div className="metric"><strong>24/7</strong><span>gateway process</span></div>
            <div className="metric"><strong>OAuth2</strong><span>dashboard access</span></div>
            <div className="metric"><strong>Multi-guild</strong><span>isolated settings</span></div>
          </div>
        </div>
      </section>
      <section className="section" id="features">
        <div className="section-head"><div><h2>One operating layer for community safety</h2><p>Core systems are included in the same product and data model.</p></div></div>
        <div className="grid">
          {features.map(([title, text]) => <article className="card" key={title}><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>
    </Shell>
  );
}
