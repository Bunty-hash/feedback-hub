import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { isConfigured } from '../lib/supabase';
import { Icon } from './Icon';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header>
        <div className="utility">
          <div className="container utility-inner">
            <NavLink to="/" end><Icon name="home" /> Feedback</NavLink>
            <NavLink to="/panel"><Icon name="message" /> Panel</NavLink>
            <NavLink to="/admin"><Icon name="lock" /> Admin</NavLink>
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
