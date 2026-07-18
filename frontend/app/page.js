import Shell from '../components/Shell';
import Image from 'next/image';

const botInviteUrl = 'https://discord.com/oauth2/authorize?client_id=1528046559923666944&permissions=1099914374358&scope=bot%20applications.commands';

const features = [
  ['Case records', 'Keep warnings, timeouts, bans, notes and appeal decisions in one member history.'],
  ['AutoMod', 'Set limits for spam, repeated messages, mentions, links, invites and blocked terms.'],
  ['Server protection', 'Detect join spikes and destructive actions, then record who did what and when.'],
  ['Verification', 'Assign roles through button or OAuth verification, including consent-based role restoration.']
];

export default function Home() {
  return (
    <Shell>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">MODERATIONDESK FOR DISCORD</span>
          <h1>Moderation without the bot pile.</h1>
          <p>Set staff access, automate routine enforcement, review cases and manage verification from one place.</p>
          <div className="hero-actions">
            <a className="button button-large" href={botInviteUrl} target="_blank" rel="noreferrer">Invite ModerationDesk <span>→</span></a>
            <a className="text-link" href="#platform">See what it covers</a>
          </div>
        </div>
        <div className="product-window" aria-label="ModerationDesk dashboard preview">
          <div className="window-bar"><span /><span /><span /><small>Control centre</small></div>
          <div className="window-body">
            <div className="preview-sidebar"><div className="preview-logo"><Image src="/brand/moderationdesk-mark.png" width={30} height={30} alt="" /></div>{['Overview','Moderation','AutoMod','Security','Verification'].map((item, index) => <div className={index === 0 ? 'active' : ''} key={item}><i />{item}</div>)}</div>
            <div className="preview-main">
              <div className="preview-heading"><div><small>DESKLABS COMMUNITY</small><strong>Moderation overview</strong></div><span className="status-dot">Connected</span></div>
              <div className="preview-stats"><div><small>OPEN CASES</small><b>3</b><span>Needs review</span></div><div><small>AUTOMOD RULES</small><b>12</b><span>Enabled</span></div><div><small>RAID MODE</small><b>Ready</b><span>Monitoring joins</span></div></div>
              <div className="activity-card"><div><strong>Recent actions</strong><span>Case log</span></div>{[['Timeout','Repeated message spam','2m ago'],['AutoMod','Invite removed','8m ago'],['Verification','Role assigned','12m ago']].map(row => <p key={row[2]}><i /> <b>{row[0]}</b><span>{row[1]}</span><small>{row[2]}</small></p>)}</div>
            </div>
          </div>
        </div>
      </section>
      <section className="family-features" id="security"><article><span>CASES</span><h3>A record your staff can follow</h3><p>Reasons, evidence and actions stay attached to the member rather than disappearing into a log channel.</p></article><article><span>SECURITY</span><h3>Automatic response, clear ownership</h3><p>Anti-spam, anti-raid and anti-nuke rules act quickly while keeping an audit trail for staff review.</p></article><article><span>ACCESS</span><h3>Roles applied on purpose</h3><p>Verification and migration require member consent, with explicit mappings for every restored role.</p></article></section>
      <section className="section platform" id="platform">
        <div className="section-head"><div><div className="section-kicker">WHAT IT REPLACES</div><h2>One place for day-to-day moderation.</h2></div><p>ModerationDesk combines the jobs usually split across case, logging, security and verification bots.</p></div>
        <div className="feature-grid">
          {features.map(([title, text]) => <article className="feature-card" key={title}><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>
    </Shell>
  );
}
