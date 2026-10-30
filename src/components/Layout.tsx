import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { isConfigured } from '../lib/supabase';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header>
        <div className="utility">
          <div className="container utility-inner">
            <NavLink to="/" end>Feedback</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </div>
        </div>
        <div className="mainbar">
          <div className="container mainbar-inner">
            <Link to="/" className="brand">
              <span className="brand-mark" aria-hidden="true">★</span>
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
