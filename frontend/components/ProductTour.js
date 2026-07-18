'use client';

import { useEffect, useState } from 'react';

const areas = [
  {
    id: 'overview',
    number: '01',
    label: 'Overview',
    kicker: 'One operating record',
    title: 'See the state of your server before you make a change.',
    text: 'ModerationDesk brings configuration, bot health and recent staff activity into one view, so owners can spot gaps without searching through commands or audit channels.',
    items: ['Configuration progress', 'Discord permission health', 'Protection status', 'Recent cases and appeals'],
    note: 'Start here each time you open a server.'
  },
  {
    id: 'moderation',
    number: '02',
    label: 'Moderation',
    kicker: 'Accountable staff actions',
    title: 'A case record the whole staff team can follow.',
    text: 'Warnings, timeouts, bans, notes and appeal decisions stay attached to the member, with reasons and staff ownership preserved for later review.',
    items: ['Case history', 'Warnings and staff notes', 'Temporary actions', 'Appeal records'],
    note: 'Consistent records across every moderation action.'
  },
  {
    id: 'protection',
    number: '03',
    label: 'Protection',
    kicker: 'Layered server security',
    title: 'Tune everyday filters and serious attack protection separately.',
    text: 'AutoMod, anti-raid and anti-nuke each have their own thresholds, exemptions and enforcement actions. Teams can see exactly which layer acted and why.',
    items: ['Spam and duplicate filters', 'Invite and link controls', 'Join-spike detection', 'Destructive-action enforcement'],
    note: 'No single opaque safety switch.'
  },
  {
    id: 'access',
    number: '04',
    label: 'Access',
    kicker: 'Member verification',
    title: 'Control member access without unsafe shortcuts.',
    text: 'Use button or Discord OAuth verification, restore selected roles and run consent-based community migrations without collecting passwords or user tokens.',
    items: ['Button verification', 'Discord OAuth', 'Auto and sticky roles', 'Consent-based migration'],
    note: 'Identity checks stay inside Discord’s permission model.'
  },
  {
    id: 'operations',
    number: '05',
    label: 'Operations',
    kicker: 'Day-to-day control',
    title: 'Keep the supporting work in the same control room.',
    text: 'Route logs by purpose, choose staff access, configure member messages and run common community workflows without adding another collection of bots.',
    items: ['Staff and admin roles', 'Structured logging', 'Welcome and goodbye messages', 'Suggestions and starboard'],
    note: 'One configuration surface for the whole team.'
  },
  {
    id: 'setup',
    number: '06',
    label: 'Setup',
    kicker: 'From invite to working server',
    title: 'Configure with real Discord roles and channels.',
    text: 'Add the bot, sign in with Discord and choose the modules your server needs. The dashboard reads the available roles, channels and permissions directly.',
    items: ['Add ModerationDesk', 'Choose a manageable server', 'Set staff access and logs', 'Enable protection as needed'],
    note: 'No IDs to memorise or configuration files to edit.'
  }
];

export default function ProductTour() {
  const [activeId, setActiveId] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const active = areas.find(area => area.id === activeId) || areas[0];

  useEffect(() => {
    const syncHash = () => {
      const requested = window.location.hash.slice(1);
      if (requested === 'security') setActiveId('protection');
      if (areas.some(area => area.id === requested)) setActiveId(requested);
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  function selectArea(id) {
    setActiveId(id);
    window.history.replaceState(null, '', `#${id}`);
  }

  return (
    <section className="product-tour" id="platform">
      <span className="tour-anchor" id="security" aria-hidden="true" />
      <header className="tour-heading">
        <div><span className="section-kicker">EXPLORE MODERATIONDESK</span><h2>One platform. Open only what you need.</h2></div>
        <p>Move between product areas without scrolling through a catalogue of features.</p>
      </header>

      <div className={`tour-frame ${collapsed ? 'collapsed' : ''}`}>
        <aside className="tour-sidebar" aria-label="Product areas">
          <div className="tour-sidebar-head">
            {!collapsed && <span>Product areas</span>}
            <button type="button" onClick={() => setCollapsed(value => !value)} aria-expanded={!collapsed} aria-label={collapsed ? 'Expand product navigation' : 'Collapse product navigation'}>
              <span aria-hidden="true">{collapsed ? '→' : '←'}</span>
            </button>
          </div>
          <nav>
            {areas.map(area => (
              <button
                type="button"
                className={active.id === area.id ? 'active' : ''}
                onClick={() => selectArea(area.id)}
                aria-current={active.id === area.id ? 'page' : undefined}
                aria-label={collapsed ? area.label : undefined}
                key={area.id}
              >
                <span className="tour-number">{area.number}</span>
                {!collapsed && <span className="tour-nav-label">{area.label}</span>}
                {!collapsed && <span className="tour-nav-arrow" aria-hidden="true">›</span>}
              </button>
            ))}
          </nav>
        </aside>

        <article className="tour-panel" aria-live="polite">
          <div className="tour-panel-copy">
            <span className="tour-kicker">{active.kicker}</span>
            <h3>{active.title}</h3>
            <p>{active.text}</p>
          </div>
          <div className="tour-capabilities">
            {active.items.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></div>)}
          </div>
          <footer className="tour-note"><i aria-hidden="true" /><span>{active.note}</span><a href="/dashboard">Open dashboard <b aria-hidden="true">→</b></a></footer>
        </article>
      </div>
    </section>
  );
}
