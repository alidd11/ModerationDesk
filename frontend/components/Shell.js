'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { productAreas } from '../content/productAreas';
import DashboardCommandPalette from './DashboardCommandPalette';
import { dashboardNavigation } from '../lib/dashboardNavigation';

export default function Shell({ children, compact = false, wide = false }) {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const dashboardContext = pathname.startsWith('/dashboard');
  const dashboardGuildId = pathname.split('/')[2] || '';
  const dashboardHref = dashboardGuildId ? `/dashboard/${dashboardGuildId}` : '/dashboard';

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => setUser(data?.user || null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = event => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('menu-open');
    document.body.classList.add('menu-open');
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.classList.remove('menu-open');
      document.body.classList.remove('menu-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <div className={compact ? 'site compact' : wide ? 'site wide' : 'site'}>
      <header className="nav" aria-label="Primary navigation">
        <div className="nav-leading">
          <button className={`hamburger-button ${dashboardContext ? 'dashboard-menu-trigger' : ''}`} type="button" aria-label={dashboardContext ? 'Open server navigation' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
          </button>
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true"><Image src="/brand/moderationdesk-mark.png" width={34} height={34} alt="" priority /></span>
            <span>ModerationDesk</span>
          </Link>
        </div>
        <nav className="nav-actions">
          {dashboardContext ? (
            <>
              <button className="dashboard-search-trigger" type="button" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}><span aria-hidden="true">⌕</span><span>Search</span><kbd>⌘K</kbd></button>
              {user && <><span className="user-chip">{user.avatar ? <img src={user.avatar} alt="" /> : null}<span>{user.username}</span></span><button className="button ghost small" onClick={logout}>Log out</button></>}
            </>
          ) : <>
            <Link href="/#plans">Plans</Link>
            {user ? (
              <><Link href="/dashboard">Dashboard</Link><span className="user-chip">{user.avatar ? <img src={user.avatar} alt="" /> : null}<span>{user.username}</span></span><button className="button ghost small" onClick={logout}>Log out</button></>
            ) : (
              <Link className="button small" href="/dashboard">Dashboard <span aria-hidden="true">→</span></Link>
            )}
          </>}
        </nav>
      </header>
      {menuOpen && (
        <div className="menu-layer">
          <button className="menu-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />
          <aside className="site-menu-drawer" role="dialog" aria-modal="true" aria-label="Site navigation">
            <div className="menu-drawer-head">
              <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
                <span className="brand-mark" aria-hidden="true"><Image src="/brand/moderationdesk-mark.png" width={34} height={34} alt="" /></span>
                <span>ModerationDesk</span>
              </Link>
              <button className="menu-close" type="button" aria-label="Close navigation menu" autoFocus onClick={() => setMenuOpen(false)}>×</button>
            </div>
            <nav className="drawer-navigation">
              {dashboardContext ? (
                <>
                  <div className="drawer-group">
                    <span className="drawer-label">Servers</span>
                    <Link className={pathname === '/dashboard' ? 'active' : ''} href="/dashboard" onClick={() => setMenuOpen(false)}><span>All servers</span><i aria-hidden="true">→</i></Link>
                  </div>
                  {dashboardNavigation.map(group => <div className="drawer-group" key={group.label}><span className="drawer-label">{group.label}</span>{group.items.map(item => <Link className={pathname === `${dashboardHref}/${item.id}` || (item.id === 'overview' && pathname === dashboardHref) ? 'active' : ''} href={`${dashboardHref}/${item.id}`} onClick={() => setMenuOpen(false)} key={item.id}><span>{item.label}</span><span className="drawer-item-meta">{item.plan && <span className="nav-plan" aria-label={`${item.plan} feature`}><i className="nav-plan-icon" aria-hidden="true" /><em>{item.plan}</em></span>}<i aria-hidden="true">→</i></span></Link>)}</div>)}
                </>
              ) : (
                <>
                  <div className="drawer-group">
                    <span className="drawer-label">Navigate</span>
                    <Link className={pathname === '/' ? 'active' : ''} href="/" onClick={() => setMenuOpen(false)}><span>Home</span><i aria-hidden="true">→</i></Link>
                    <Link className={pathname.startsWith('/dashboard') ? 'active' : ''} href="/dashboard" onClick={() => setMenuOpen(false)}><span>Dashboard</span><i aria-hidden="true">→</i></Link>
                  </div>
                  <div className="drawer-group">
                    <span className="drawer-label">Product</span>
                    {productAreas.map(area => {
                      const href = `/platform/${area.id}`;
                      return <Link className={pathname === href ? 'active' : ''} href={href} onClick={() => setMenuOpen(false)} key={area.id}><small>{area.number}</small><span>{area.label}</span><i aria-hidden="true">→</i></Link>;
                    })}
                  </div>
                </>
              )}
              <div className="drawer-group">
                <span className="drawer-label">Company</span>
                <Link href="/#plans" onClick={() => setMenuOpen(false)}><span>Plans</span><i aria-hidden="true">→</i></Link>
                <Link className={pathname === '/privacy' ? 'active' : ''} href="/privacy" onClick={() => setMenuOpen(false)}><span>Privacy</span><i aria-hidden="true">→</i></Link>
                <Link className={pathname === '/terms' ? 'active' : ''} href="/terms" onClick={() => setMenuOpen(false)}><span>Terms</span><i aria-hidden="true">→</i></Link>
              </div>
            </nav>
            <div className="drawer-footer"><span>Discord moderation software</span><strong>A DeskLabs product</strong></div>
          </aside>
        </div>
      )}
      <main>{children}</main>
      <DashboardCommandPalette enabled={dashboardContext && Boolean(dashboardGuildId)} />
      {!dashboardContext && <footer className="footer">
        <div><strong>ModerationDesk</strong><span>Discord moderation software from DeskLabs.</span></div>
        <nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:support@moderationdesk.com">Support</a></nav>
      </footer>}
    </div>
  );
}
