import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase, isConfigured } from '../lib/supabase';
import Login from '../pages/Login';

type Gate =
  | { s: 'loading' }
  | { s: 'signedout' }
  | { s: 'denied' }
  | { s: 'ok' }
  | { s: 'host' };

/** Shows the login form, an access-denied notice, or the admin content. Access is also enforced by RLS in the database. */
export default function AdminGate({ children, masterOnly = false }: { children: ReactNode; masterOnly?: boolean }) {
  const [state, setState] = useState<Gate>({ s: 'loading' });

  useEffect(() => {
    if (!isConfigured) {
      setState({ s: 'signedout' });
      return;
    }
    let active = true;

    async function evaluate(session: Session | null) {
      if (!session) {
        if (active) setState({ s: 'signedout' });
        return;
      }
      const { data, error } = await supabase.rpc('admin_role');
      if (!active) return;
      if (error || (data !== 'master' && data !== 'host')) setState({ s: 'denied' });
      else setState({ s: data === 'master' ? 'ok' : 'host' });
    }

    supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Deferred so Supabase calls are not made inside the auth callback.
      setTimeout(() => evaluate(session), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state.s === 'loading') return <p className="muted center">Checking access…</p>;
  if (state.s === 'signedout') return <Login />;
  if (state.s === 'denied') {
    return (
      <div className="card confirm">
        <h1>No admin access</h1>
        <p className="muted">This account is signed in but is not on the administrator list. Please contact the site owner.</p>
        <div className="actions">
          <button type="button" className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    );
  }
  if (state.s === 'host' && masterOnly) return <Navigate to="/admin/panel" replace />;
  return <>{children}</>;
}
