import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

export default function AdminNav() {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    void supabase.rpc('admin_role').then(({ data }) => setRole(typeof data === 'string' ? data : null));
  }, []);
  return (
    <nav className="admin-nav" aria-label="Administrator sections">
      {role === 'master' && <NavLink to="/admin" end><Icon name="chart" /> Dashboard</NavLink>}
      <NavLink to="/admin/panel"><Icon name="message" /> Panel channels</NavLink>
      {role === 'master' && <NavLink to="/admin/hosts"><Icon name="users" /> Hosts</NavLink>}
    </nav>
  );
}
