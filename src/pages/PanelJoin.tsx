import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isConfigured } from '../lib/supabase';
import { Icon } from '../components/Icon';

export default function PanelJoin() {
  const nav = useNavigate();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function join(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) { setError('Enter the 6-digit PIN shown by the organiser.'); return; }
    if (!isConfigured) { setError('The panel is not connected yet.'); return; }
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.rpc('channel_join', { p_code: pin });
    setBusy(false);
    if (err) setError('Could not join. Please try again.');
    else if (!data || data.length === 0) setError('No panel found with that PIN.');
    else nav(`/panel/${pin}`);
  }

  return (
    <div className="join">
      <img className="join-badge" src="/join-panel.png" alt="" width="200" height="200" />
      <h1>Enter your PIN</h1>
      <p className="muted lead">Type the 6-digit PIN shown by the host to ask questions and upvote.</p>
      <form className="join-card" onSubmit={join}>
        <label htmlFor="pin" className="sr">Panel PIN</label>
        <input id="pin" className="pin" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="000000" value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-primary join-btn" disabled={busy}>{busy ? 'Joining…' : <>Join panel <Icon name="arrowRight" /></>}</button>
      </form>
    </div>
  );
}
