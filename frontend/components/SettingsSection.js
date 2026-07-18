'use client';

import { useState } from 'react';
import { api } from '../lib/api';

export default function SettingsSection({ id, title, description, guildId, csrf, section, data, children, onSaved }) {
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

  return <section className="card" id={id}><h2>{title}</h2><p>{description}</p>{children}<div className="form-actions"><button className="button" disabled={status.busy} onClick={save}>{status.busy ? 'Saving…' : `Save ${title}`}</button>{status.message && <span className={`status ${status.bad ? 'bad' : 'good'}`}>{status.message}</span>}</div></section>;
}
