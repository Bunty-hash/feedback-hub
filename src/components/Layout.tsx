import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { isConfigured, supabase } from '../lib/supabase';
import { Icon } from './Icon';

function Account() {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    async function apply(userEmail: string | null) {
      if (!active) return;
      setEmail(userEmail);
      if (!userEmail) { setRole(null); return; }
      const { data } = await supabase.rpc('admin_profile');
      const p = Array.isArray(data) ? data[0] : null;
      if (active) { setRole(p?.role ?? null); setName(p?.display_name ?? null); }
    }
    void supabase.auth.getSession().then(({ data }) => apply(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { setTimeout(() => void apply(session?.user.email ?? null), 0); });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
  if (!email) return null;
  return (
    <span className="account">
      <Icon name="user" size={14} />
      <span className="account-name" title={email}>{name || email}</span>
      {role && <span className="account-role">{role}</span>}
      <button type="button" className="account-out" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </span>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header>
        <div className="utility">
          <div className="container utility-inner">
            <NavLink to="/" end><Icon name="home" /> Feedback</NavLink>
            <NavLink to="/panel"><Icon name="message" /> Panel</NavLink>
            <NavLink to="/admin"><Icon name="lock" /> Admin</NavLink>
            <Account />
          </div>
        </div>
        <div className="mainbar">
          <div className="container mainbar-inner">
            <Link to="/" className="brand">
              <img className="brand-logo" src="/ma-logo.png" alt="MA" width="52" height="25" />
              <span>Feedback Hub</span>
            </Link>
          </div>
        </div>
      </header>
      {!isConfigured && (
        <div className="banner" role="alert">
          Supabase is not connected yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable submissions and the admin area.
        </div>
      )}
      <main className="container main">{children}</main>
      <footer className="footer">
        <div className="container">Your feedback helps us improve. Participant names are optional.</div>
      </footer>
    </div>
  );
}
