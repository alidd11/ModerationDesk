'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';

const botInviteUrl = guildId => `https://discord.com/oauth2/authorize?client_id=1528046559923666944&permissions=1099914374358&scope=bot%20applications.commands&guild_id=${guildId}&disable_guild_select=true`;

export default function DashboardPage() {
  const [state, setState] = useState({ loading: true, guilds: [], error: '' });

  useEffect(() => {
    Promise.all([api('/api/auth/session'), api('/api/guilds')])
      .then(([, guildData]) => setState({ loading: false, guilds: guildData.guilds, error: '' }))
      .catch(error => setState({ loading: false, guilds: [], error: error.status === 401 ? 'signin' : error.message }));
  }, []);

  return (
    <Shell>
      <section className="section server-directory">
        <div className="section-head server-directory-head">
          <div><span className="section-kicker">SERVERS</span><h1>Choose a server</h1><p>Only servers where you have Manage Server permission are shown.</p></div>
          <a className="button secondary" href="/api/auth/login?returnTo=/dashboard">Refresh from Discord</a>
        </div>
        {state.loading && <div className="card skeleton">Loading your servers…</div>}
        {state.error === 'signin' && <div className="card"><h2>Sign in to continue</h2><p>Discord confirms which servers you are allowed to manage. ModerationDesk does not receive your password.</p><a className="button" href="/api/auth/login">Continue with Discord</a></div>}
        {state.error && state.error !== 'signin' && <div className="error">{state.error}</div>}
        {!state.loading && !state.error && (
          <div className="server-grid">
            {state.guilds.map(guild => (
              <article className="card guild-card" key={guild.id}>
                {guild.icon ? <img className="guild-icon" src={guild.icon} alt="" /> : <div className="guild-icon">{guild.name.slice(0, 2).toUpperCase()}</div>}
                <div className="grow"><div className="guild-title"><h3>{guild.name}</h3>{guild.installed && <span className="connection online">Connected</span>}</div><p>{guild.installed ? 'Open the server configuration.' : 'Install ModerationDesk to start configuring this server.'}</p></div>
                {guild.installed ? <Link className="button small" href={`/dashboard/${guild.id}`}>Open settings <span>→</span></Link> : <a className="button secondary small" href={botInviteUrl(guild.id)} target="_blank" rel="noreferrer">Invite bot <span aria-hidden="true">↗</span></a>}
              </article>
            ))}
            {!state.guilds.length && <div className="card"><h3>No manageable servers found</h3><p>Discord did not return a server where this account has Manage Server permission.</p></div>}
          </div>
        )}
      </section>
    </Shell>
  );
}
