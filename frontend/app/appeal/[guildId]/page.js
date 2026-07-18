'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Shell from '../../../components/Shell';
import { Area, Text } from '../../../components/Fields';
import { api } from '../../../lib/api';

export default function AppealPage() {
  const { guildId } = useParams();
  const [status, setStatus] = useState({ loading: true, data: null, error: '' });
  const [csrf, setCsrf] = useState('');
  const [caseId, setCaseId] = useState('');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api(`/api/appeals/${guildId}/status`),
      api('/api/auth/session').catch(() => null)
    ]).then(([appealStatus, session]) => {
      setStatus({ loading: false, data: appealStatus, error: '' });
      setCsrf(session?.csrf || '');
    }).catch(error => setStatus({ loading: false, data: null, error: error.message }));
  }, [guildId]);

  async function submit() {
    setBusy(true);
    try {
      const response = await api(`/api/appeals/${guildId}`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrf },
        body: JSON.stringify({ caseId: caseId || null, reason })
      });
      setResult(response);
    } catch (error) {
      setStatus(current => ({ ...current, error: error.message }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell compact>
      <section className="section">
        {status.loading && <div className="card skeleton">Loading appeal form…</div>}
        {status.error && <div className="error">{status.error}</div>}
        {status.data && !result && (
          <div className="card">
            <div className="guild-card">
              {status.data.guild.icon ? <img className="guild-icon" src={status.data.guild.icon} alt="" /> : <div className="guild-icon">{status.data.guild.name.slice(0, 2).toUpperCase()}</div>}
              <div className="grow"><h1>Appeal to {status.data.guild.name}</h1><p>Request a review of a moderation decision.</p></div>
            </div>
            {!status.data.authenticated ? (
              <div style={{ marginTop: 22 }}><p>Sign in with Discord so the moderation team can confirm your identity. ModerationDesk requests the <code>identify</code> scope only for this appeal.</p><a className="button" href={`/api/appeals/${guildId}/login`}>Continue with Discord</a></div>
            ) : (
              <div className="form-grid" style={{ marginTop: 22 }}>
                <Text label="Case number" help="Optional. It must belong to your Discord account." type="number" min="1" value={caseId} onChange={setCaseId} />
                <div className="full"><Area label="Why should the decision be reviewed?" help="20 to 4,000 characters." value={reason} onChange={setReason} /></div>
                <div className="full form-actions"><button className="button" disabled={busy || reason.trim().length < 20} onClick={submit}>{busy ? 'Submitting…' : 'Submit appeal'}</button></div>
              </div>
            )}
          </div>
        )}
        {result && <div className="card"><span className="badge good">Received</span><h1>{result.duplicate ? 'An appeal is already open' : 'Appeal submitted'}</h1><p>Reference: <strong>{result.appeal.id}</strong></p><p>The server moderation team can now review and respond through ModerationDesk.</p></div>}
      </section>
    </Shell>
  );
}
