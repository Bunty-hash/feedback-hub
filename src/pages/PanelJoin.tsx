import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isConfigured } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { useT } from '../i18n';

export default function PanelJoin() {
  const t = useT();
  const nav = useNavigate();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function join(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) { setError(t('join.errPin')); return; }
    if (!isConfigured) { setError(t('join.errDb')); return; }
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.rpc('channel_join', { p_code: pin });
    setBusy(false);
    if (err) setError(t('join.errJoin'));
    else if (!data || data.length === 0) setError(t('join.errNone'));
    else nav(`/panel/${pin}`);
  }

  return (
    <div className="join">
      <img className="join-badge" src="/join-panel.png" alt="" width="200" height="200" />
      <h1>{t('join.title')}</h1>
      <p className="muted lead">{t('join.lead')}</p>
      <form className="join-card" onSubmit={join}>
        <label htmlFor="pin" className="sr">{t('join.label')}</label>
        <input id="pin" className="pin" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="000000" value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button type="submit" className="btn btn-primary join-btn" disabled={busy}>{busy ? t('join.busy') : <>{t('join.btn')} <Icon name="arrowRight" /></>}</button>
      </form>
    </div>
  );
}
