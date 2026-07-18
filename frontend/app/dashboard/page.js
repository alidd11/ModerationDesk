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
          <div><span className="section-kicker">CONTROL CENTRE</span><h1>Your communities</h1><p>Choose a Discord server to configure its moderation and security systems.</p></div>
          <a className="button secondary" href="/api/auth/login?returnTo=/dashboard">Refresh access</a>
        </div>
        {state.loading && <div className="card skeleton">Loading your servers…</div>}
        {state.error === 'signin' && <div className="card"><h2>Sign in required</h2><p>Connect your Discord account to view the servers you can manage.</p><a className="button" href="/api/auth/login">Sign in with Discord</a></div>}
        {state.error && state.error !== 'signin' && <div className="error">{state.error}</div>}
        {!state.loading && !state.error && (
          <div className="server-grid">
            {state.guilds.map(guild => (
              <article className="card guild-card" key={guild.id}>
                {guild.icon ? <img className="guild-icon" src={guild.icon} alt="" /> : <div className="guild-icon">{guild.name.slice(0, 2).toUpperCase()}</div>}
                <div className="grow"><div className="guild-title"><h3>{guild.name}</h3><span className={`connection ${guild.installed ? 'online' : ''}`}>{guild.installed ? 'Connected' : 'Not installed'}</span></div><p>{guild.installed ? 'Moderation, security and server settings are ready.' : 'Install ModerationDesk to manage this community.'}</p></div>
                {guild.installed ? <Link className="button small" href={`/dashboard/${guild.id}`}>Manage server <span>→</span></Link> : <span className="badge warning">Action needed</span>}
              </article>
            ))}
            {!state.guilds.length && <div className="card"><h3>No manageable servers found</h3><p>Discord did not return a server where this account has Manage Server permission.</p></div>}
          </div>
        )}
      </section>
    </Shell>
  );
}
