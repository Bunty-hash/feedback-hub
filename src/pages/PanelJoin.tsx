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
      <div className="shapes" aria-hidden="true"><i className="sh s1" /><i className="sh s2" /><i className="sh s3" /><i className="sh s4" /></div>
      <h1>Join a panel</h1>
      <p className="muted lead">Enter the PIN on the screen to ask questions, upvote and reply.</p>
      <form className="join-card" onSubmit={join}>
        <label htmlFor="pin" className="sr">Panel PIN</label>
        <input id="pin" className="pin" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="PIN" value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-primary join-btn" disabled={busy}>{busy ? 'Joining…' : <>Enter <Icon name="arrowRight" /></>}</button>
      </form>
    </div>
  );
}
