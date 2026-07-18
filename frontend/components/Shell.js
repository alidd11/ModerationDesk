'use client';

import Link from 'next/link';
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
      <header className="nav">
        <Link className="brand" href="/">
          <span className="brand-mark">MD</span>
          <span>ModerationDesk</span>
        </Link>
        <nav className="nav-actions">
          <Link href="/dashboard">Dashboard</Link>
          {user ? (
            <button className="button ghost small" onClick={logout}>Log out</button>
          ) : (
            <a className="button small" href="/api/auth/login">Sign in with Discord</a>
          )}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <span>ModerationDesk</span>
        <span>Secure Discord operations without user tokens or silent account transfers.</span>
      </footer>
    </div>
  );
}
