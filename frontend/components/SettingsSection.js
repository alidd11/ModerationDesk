'use client';

import { useState } from 'react';
import { api } from '../lib/api';

function UpgradeGate({ upgrade, children }) {
  return (
    <div className="plan-gate">
      <div className="plan-gate-preview" inert="" aria-hidden="true">{children}</div>
      <div className="plan-gate-overlay">
        <span className="plan-gate-eyebrow">{upgrade.plan} feature</span>
        <h3>{upgrade.title}</h3>
        <p>{upgrade.description}</p>
        <a className="button small" href={upgrade.href} target="_blank" rel="noreferrer">View {upgrade.plan} in Discord <span aria-hidden="true">↗</span></a>
        <small>Subscriptions are managed securely through Discord for this server.</small>
      </div>
    </div>
  );
}

export default function SettingsSection({ id, title, description, guildId, csrf, section, data, children, onSaved, headerControl, upgrade, className = '' }) {
  const [status, setStatus] = useState({ busy: false, message: '', bad: false });

  async function save() {
    setStatus({ busy: true, message: 'Saving…', bad: false });
    try {
      const result = await api(`/api/guilds/${guildId}/settings/${section}`, {
        method: 'PATCH',
        headers: { 'X-CSRF-Token': csrf },
        body: JSON.stringify({ data })
      });
      setStatus({ busy: false, message: 'Saved.', bad: false });
      onSaved?.(result.config);
    } catch (error) {
      setStatus({ busy: false, message: error.message, bad: true });
    }
  }

  return (
    <section className={`card settings-section ${className}`} id={id}>
      <div className="settings-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {headerControl && <div className="settings-header-control">{headerControl}</div>}
      </div>
      <div className={`settings-body ${upgrade ? 'settings-body-locked' : ''}`}>{upgrade ? <UpgradeGate upgrade={upgrade}>{children}</UpgradeGate> : children}</div>
      {!upgrade && <div className="settings-footer">
          <button className="button" disabled={status.busy} onClick={save}>{status.busy ? 'Saving…' : `Save ${title}`}</button>
          {status.message && <span className={`status ${status.bad ? 'bad' : 'good'}`} role="status">{status.message}</span>}
        </div>}
    </section>
  );
}
