'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Shell({ children, compact = false }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => setUser(data?.user || null))
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <div className={compact ? 'site compact' : 'site'}>
      <header className="nav" aria-label="Primary navigation">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true"><Image src="/brand/moderationdesk-mark.png" width={34} height={34} alt="" priority /></span>
          <span>ModerationDesk</span>
        </Link>
        <nav className="nav-actions">
          <Link href="/#platform">Platform</Link>
          <Link href="/#security">Security</Link>
          <Link href="/#plans">Plans</Link>
          {user ? (
            <><Link href="/dashboard">Dashboard</Link><span className="user-chip">{user.avatar ? <img src={user.avatar} alt="" /> : null}<span>{user.username}</span></span><button className="button ghost small" onClick={logout}>Log out</button></>
          ) : (
            <Link className="button small" href="/dashboard">Dashboard <span aria-hidden="true">→</span></Link>
          )}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div><strong>ModerationDesk</strong><span>Discord moderation software from DeskLabs.</span></div>
        <nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:support@moderationdesk.com">Support</a></nav>
      </footer>
    </div>
  );
}
