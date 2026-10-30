import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import AdminNav from '../components/AdminNav';

interface Host { user_id: string; email: string | null; created_at: string; channels: number }

async function call(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke('manage-hosts', { body });
  if (error) {
    let msg = 'Something went wrong. Please try again.';
    try { const j = await (error as { context?: Response }).context?.json(); if (j?.error) msg = j.error; } catch { /* keep default */ }
    throw new Error(msg);
  }
  return data as { hosts?: Host[]; ok?: boolean };
}

export default function HostsAdmin() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setHosts((await call({ action: 'list' })).hosts ?? []); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setOk('');
    try {
      await call({ action: 'create', email, password });
      setOk(`Host account created for ${email.trim()}. Share the password with them securely and ask them to keep it private.`);
      setEmail(''); setPassword('');
      await load();
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }
  async function remove(h: Host) {
    if (!window.confirm(`Remove the host account ${h.email ?? ''}? Their ${h.channels} channel(s) will move to the master account.`)) return;
    setError(''); setOk('');
    try { await call({ action: 'delete', user_id: h.user_id }); await load(); } catch (err) { setError((err as Error).message); }
  }

  return (
    <div className="dash">
      <div className="dash-head">
        <div><p className="kicker">Master administrator</p><h1>Host accounts</h1>
          <p className="muted">Create logins for hosts. Each host signs in at /admin and sees only the channels they create.</p></div>
        <div className="actions"><button type="button" className="btn btn-ghost" onClick={() => supabase.auth.signOut()}><Icon name="logout" /> Sign out</button></div>
      </div>
      <AdminNav />
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {ok && <div className="alert" role="status">{ok}</div>}

      <form className="panel filters" onSubmit={create} autoComplete="off">
        <div className="field grow"><label htmlFor="he">Host email (used to sign in)</label>
          <input id="he" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></div>
        <div className="field grow"><label htmlFor="hp">Temporary password (min. 10 characters)</label>
          <input id="hp" type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
        <button type="submit" className="btn btn-primary" disabled={busy}><Icon name="plus" /> Create host</button>
      </form>

      <ul className="chan-list">
        {hosts.length === 0 && <li className="muted">No host accounts yet.</li>}
        {hosts.map((h) => (
          <li key={h.user_id} className="chan">
            <span><strong>{h.email ?? 'Unknown'}</strong><br /><small className="muted">{h.channels} channel{h.channels === 1 ? '' : 's'}</small></span>
            <div className="actions"><button type="button" className="btn btn-small" onClick={() => void remove(h)}><Icon name="x" /> Remove</button></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
