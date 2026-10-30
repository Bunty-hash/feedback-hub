import { Icon } from '../components/Icon';
import { useState, type FormEvent } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !isConfigured) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError('Sign-in failed. Please check your email and password.');
    setBusy(false);
  }

  return (
    <form className="card form login" onSubmit={onSubmit}>
      <h1>Administrator sign-in</h1>
      <p className="muted">Sign in to view and export feedback.</p>
      {!isConfigured && (
        <div className="alert alert-error" role="alert">Supabase is not connected yet, so sign-in is unavailable.</div>
      )}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy || !isConfigured}>
        {busy ? 'Signing in…' : <><Icon name="login" /> Sign in</>}
      </button>
    </form>
  );
}
