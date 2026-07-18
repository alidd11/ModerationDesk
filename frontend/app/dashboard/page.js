'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';

export default function DashboardPage() {
  const [state, setState] = useState({ loading: true, guilds: [], error: '' });

  useEffect(() => {
    Promise.all([api('/api/auth/session'), api('/api/guilds')])
      .then(([, guildData]) => setState({ loading: false, guilds: guildData.guilds, error: '' }))
      .catch(error => setState({ loading: false, guilds: [], error: error.status === 401 ? 'signin' : error.message }));
  }, []);

  return (
    <Shell>
      <section className="section">
        <div className="section-head">
          <div><h1>Your Discord servers</h1><p>Manage servers where you hold the Manage Server permission.</p></div>
          <a className="button" href="/api/auth/login?returnTo=/dashboard">Refresh Discord access</a>
        </div>
        {state.loading && <div className="card skeleton">Loading your servers…</div>}
        {state.error === 'signin' && <div className="card"><h2>Sign in required</h2><p>Connect your Discord account to view the servers you can manage.</p><a className="button" href="/api/auth/login">Sign in with Discord</a></div>}
        {state.error && state.error !== 'signin' && <div className="error">{state.error}</div>}
        {!state.loading && !state.error && (
          <div className="grid">
            {state.guilds.map(guild => (
              <article className="card guild-card" key={guild.id}>
                {guild.icon ? <img className="guild-icon" src={guild.icon} alt="" /> : <div className="guild-icon">{guild.name.slice(0, 2).toUpperCase()}</div>}
                <div className="grow"><h3>{guild.name}</h3><p>{guild.installed ? 'ModerationDesk is installed.' : 'Bot not installed in this server.'}</p></div>
                {guild.installed ? <Link className="button small" href={`/dashboard/${guild.id}`}>Manage</Link> : <span className="badge warning">Not installed</span>}
              </article>
            ))}
            {!state.guilds.length && <div className="card"><h3>No manageable servers found</h3><p>Discord did not return a server where this account has Manage Server permission.</p></div>}
          </div>
        )}
      </section>
    </Shell>
  );
}
